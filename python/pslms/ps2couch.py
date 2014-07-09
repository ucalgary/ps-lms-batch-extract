#!/usr/bin/env python
# coding=utf-8

# Example invocations
# -------------------
# ps2couch D2L_EXTRACT_SUMMER_D2L2145PEOPLE.XML     person     person LMS_DATA_2145_DB
# ps2couch D2L_EXTRACT_SUMMER_D2L2145GROUP.XML      group      course LMS_DATA_2145_DB
# ps2couch D2L_EXTRACT_SUMMER_D2L2145MEMBERSHIP.XML membership member LMS_DATA_2145_DB

import json
import os
import progressbar
import sys
from copy import copy
from lxml import etree
from datetime import datetime as dt
from pytz import timezone

from pslms.base import LMSObject


class PS2Couch(LMSObject):

	def argument_parser(self):
		parser = super(PS2Couch, self).argument_parser()

		parser.add_argument('file', help='Path to XML file with IMS Enterprise data')
		parser.add_argument('element', help='The entity element name in the incoming XML data')
		parser.add_argument('type', help='The type to use in stored JSON documents')
		parser.add_argument('db', help='CouchDB connection name')
		parser.add_argument('-batch', default='100', type=int, help='CouchDB bulk document batch size')

		return parser

	def main(self):
		queued_docs = []
		process_f = {
			'membership': self.process_membership_doc,
			'person': self.process_person_doc
		}.get(self.args.element, self.process_doc)
		target_db = self.couchdb_client(self.args.db)
		datasource = None
		datetime = None

		# Start with scanning specifically for the properties element once.
		# The properties element appears at the top of the file for PeopleSoft data,
		# but at the end of the file for Destiny One data.
		context = etree.iterparse(self.args.file, events=('end',), tag='properties')
		for event, elem in context:
			assert elem.tag == 'properties'
			properties = self.etree_to_dict(elem)
			datasource = properties['datasource']
			datetime = properties['datetime']
			try:
				datetime_ = dt.strptime(datetime, '%Y-%m-%d %H:%M:%S')
				datetime_ = timezone('Canada/Mountain').localize(datetime_)
				datetime = datetime_.isoformat()
			except:
				raise

		# Then, scan for and parse the user specified elements,
		# batching up to batch elements before processing
		with open(self.args.file, 'r') as f:
			progress = progressbar.ProgressBar(maxval=os.path.getsize(self.args.file))
			progress.start()

			context = etree.iterparse(f, events=('end',), tag=self.args.element)
			for event, elem in context:
				assert elem.tag == self.args.element
				progress.update(f.tell())
				doc = self.etree_to_dict(elem)
				if not 'datasource' in doc:
					doc['datasource'] = datasource
				if not 'datetime' in doc:
					doc['datetime'] = datetime
				queued_docs.append(doc)

				if len(queued_docs) >= self.args.batch:
					self.process_documents(queued_docs, target_db, process_f)
					queued_docs = []

			progress.finish()

		if len(queued_docs) > 0:
			self.process_documents(queued_docs, target_db, process_f)

	def process_documents(self, src_docs, target_db, process_f):
		# Filter out source documents that do not have an id,
		# then bulk fetch the corresponding docs from the database
		src_docs = [doc for doc in src_docs if 'id' in doc.get('sourcedid', {})]
		if self.args.element == 'person':
			source_system = {
				'PeopleSoft': 'PS',
				'Destiny One': 'D1'
			}
			for doc in src_docs:
				doc['sourcedid']['id'] = doc['sourcedid']['id'] + '-' + source_system.get(doc.get('datasource', 'Unknown'), 'NA')
		doc_ids = [doc.get('sourcedid').get('id') for doc in src_docs]
		db_docs = [row.doc for row in target_db.view('_all_docs', keys=doc_ids, include_docs=True)]
		updates = []

		# For every pair of src and db documents, if they differ,
		# then process them and place in updates for bulk update
		for src_doc, db_doc in zip(src_docs, db_docs):
			if self.docs_differ(src_doc, db_doc):
				upd_doc = process_f(src_doc, db_doc, target_db)
				if upd_doc:
					updates.extend(upd_doc)

		if len(updates) > 0:
			results = target_db.update(updates)

	def docs_differ(self, src_doc, db_doc):
		# If the two docs are the same object, then they do not differ
		if src_doc is db_doc:
			return False

		# If the document from the database is None, then they are considered different
		if db_doc == None:
			return True

		# Build key lists for both documents, ignoring special keys
		skip_keys = ('mapping', 'datetime', 'attribute_revisions', 'lmsexport')
		src_keys = [key for key in src_doc.keys() if key[0] != '_' and not (key in skip_keys)]
		doc_keys = [key for key in src_doc.keys() if key[0] != '_' and not (key in skip_keys)]
		
		# If the number of keys differ, then the doc differ
		if len(src_keys) != len(doc_keys):
			return True

		# Build a set of all keys
		# If the length of all_keys differs from doc_keys (or src_keys), then the docs differ
		all_keys = set(src_keys) | set(doc_keys)
		if len(all_keys) != len(doc_keys):
			return True

		# For each key, check if the values differ
		return any(src_doc.get(key) != db_doc.get(key) for key in all_keys)

	def process_doc(self, src_doc, db_doc, db):
		# Copy in special keys if there is an existing
		# document in the database. Otherwise, promote _id from
		# sourcedid.id
		upd_doc = copy(src_doc)

		if db_doc == None:
			upd_doc['_id'] = src_doc['sourcedid']['id']
		else:
			for key in ('_id', '_rev'):
				assert key in db_doc
				upd_doc[key] = db_doc[key]

			# Copy in special keys, if they exist
			for key in ('mapping', 'attribute_revisions', 'lmsexport'):
				if key in db_doc:
					upd_doc[key] = db_doc[key]

		# Set the document type from args
		upd_doc['type'] = self.args.type

		return (upd_doc,)

	def process_membership_doc(self, src_doc, db_doc, db):
		# Memberships are broken down by member
		
		membership_sourcedid = src_doc['sourcedid']
		membership_id = membership_sourcedid['id']
		datasource = src_doc['datasource']

		# Get the set of membership document IDs currently in the data for this membership source.
		# The difference between this set and the set of members that are about to be parsed in
		# will have their role status set to 0, to indicate they are unenrolled.
		existing_members = {row.key:row.doc for row in db.view('_all_docs', startkey=membership_id + '-', endkey=membership_id + '-{}', include_docs=True)}
		updates = []

		members = (src_doc['member'],) if isinstance(src_doc['member'], dict) else src_doc['member']
		for member in members:
			member_id =  member['sourcedid']['id']
			if member_id == None:
				print 'Empty id encountered'
				continue
			member_id = membership_id + '-' + member_id
			
			# Fill in the member doc
			member['sourcedid']['id'] = member_id
			member['membership_sourcedid'] = membership_sourcedid
			member['type'] = self.args.type
			member['datasource'] = src_doc['datasource']
			member['datetime'] = src_doc['datetime']

			# Fetch and remove the member's existing doc, if it exists
			existing_member = existing_members.pop(member_id, None)

			if self.docs_differ(member, existing_member):
				upd_member = self.process_doc(member, existing_member, db)
				if upd_member:
						updates.extend(upd_member)

		# Any existing members that remain were not observed.
		# Marked them all as unenrolled by setting their role status to 0.
		if datasource == 'PeopleSoft':
			for member in existing_members.values():
				member['role']['status'] = 0
				updates.append(member)

		return updates

	def process_person_doc(self, src_doc, db_doc, db):
		# Person documents track revisions to name and email specifically
		updates = self.process_doc(src_doc, db_doc, db)

		if updates:
			attribute_revisions = updates[0].get('attribute_revisions', None)
			if not attribute_revisions:
				attribute_revisions = {}
				updates[0]['attribute_revisions'] = attribute_revisions

			for key in ('name', 'email'):
				if db_doc == None or db_doc.get(key) != src_doc.get(key):
					attribute_revisions[key] = src_doc['datetime']

		return updates

	def _is_sequence(self, arg):
		return (not hasattr(arg, "strip") and
						hasattr(arg, "__getitem__") or
						hasattr(arg, "__iter__"))


def main(args=None):
	PS2Couch(
		args = args
	).run()


if __name__ == '__main__':
	main()

