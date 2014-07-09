#!/usr/bin/env python
# coding=utf-8

import json
import sys
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
		context = etree.iterparse(self.args.file, events=('end',), tag=self.args.element)
		for event, elem in context:
			assert elem.tag == self.args.element
			doc = self.etree_to_dict(elem)
			if not 'datasource' in doc:
				doc['datasource'] = datasource
			if not 'datetime' in doc:
				doc['datetime'] = datetime
			process_f(doc, target_db)

	def doc_with_extracted_id(self, doc):
		doc_id = doc.get('sourcedid', {}).get('id')

		if doc_id:
			# Unconditionally change underscores to hyphens.
			# The data from PeopleSoft seems to vary between underscores and hyphens.
			doc_id.replace('_', '-')
			doc['_id'] = doc_id

		return doc

	def process_doc(self, doc, target_db):
		doc = self.doc_with_extracted_id(doc)
		if not '_id' in doc:
			return
		doc['type'] = self.args.type
		target_db.update_doc('lms/from_ps', docid=doc['_id'], body=doc)

	def process_membership_doc(self, doc, target_db):
		# Memberships are further broken down by member
		print doc['sourcedid']['id']
		membership_sourcedid = doc['sourcedid']
			queued_docs.append(doc)

			if len(queued_docs) >= self.args.batch:
				for doc in queued_docs:
					process_f(doc, target_db)
				queued_docs = []

		if len(queued_docs) > 0:
			for doc in queued_docs:
					process_f(doc, target_db)
		membership_id = membership_sourcedid['id']
		datasource = doc['datasource']

		# Get the set of membership document IDs currently in the data for this membership source.
		# The difference between this set and the set of members that are about to be parsed in
		# will have their role status set to 0, to indicate they are unenrolled.
		existing_members = set([row.id for row in target_db.view('_all_docs', startkey=membership_id + '-', endkey=membership_id + '-{}')])
		processed_members= set()

		members = (doc['member'],) if isinstance(doc['member'], dict) else doc['member']
		for member in members:
			if member['sourcedid']['id'] == None:
				print 'Empty id encountered'
				continue
			member['_id'] = membership_id + '-' + member['sourcedid']['id']
			member['membership_sourcedid'] = membership_sourcedid
			member['type'] = self.args.type
			member['datasource'] = doc['datasource']
			member['datetime'] = doc['datetime']
			target_db.update_doc('lms/from_ps', docid=member['_id'], body=member)
			processed_members.add(member['_id'])

		# For IDs that were not observed, marked them all as unenrolled
		# by setting their role status to 0
		if datasource == 'PeopleSoft':
			unobserved_members = existing_members - processed_members
			for member_id in unobserved_members:
				target_db.update_doc('lms/member_status', docid=member_id, body=0)

	def process_person_doc(self, doc, target_db):
		# Person docs have a custom ID that includes the source because the same IDs can exist from
		# both PeopleSoft and Destiny One
		sourcedid = doc.get('sourcedid', {})
		if not sourcedid:
			return
		base_id = sourcedid.get('id')
		if not base_id:
			return
		source_system = {
			'PeopleSoft': 'PS',
			'Destiny One': 'D1'
		}.get(doc.get('datasource', 'Unknown'), 'UK')
		doc['_id'] = base_id + '-' + source_system
		doc['type'] = self.args.type
		target_db.update_doc('lms/from_ps', docid=doc['_id'], body=doc)

	def _is_sequence(self, arg):
		return (not hasattr(arg, "strip") and
						hasattr(arg, "__getitem__") or
						hasattr(arg, "__iter__"))


def main(args=None):
	PS2Couch(
		args = args,
		connection_info = {
			'lms_data': {
				'url': 'http://127.0.0.1:5984/lms-data'
			},
			'2141': {
				'url': 'http://127.0.0.1:5984/lms-data-2141'
			},
			'2143': {
				'url': 'http://127.0.0.1:5984/lms-data-2143'
			},
			'2145': {
				'url': 'http://127.0.0.1:5984/lms-data-2145'
			},
			'2147': {
				'url': 'http://127.0.0.1:5984/lms-data-2147'
			}
		}
	).run()

def people_main():
	args = sys.argv[1:]
	args.extend(['person', 'person', 'lms_data'])
	main(args)

def membership_main():
	args = sys.argv[1:]
	args.extend(['membership', 'member', 'lms_data'])
	main(args)

def group_main():
	args = sys.argv[1:]
	args.extend(['group', 'course', 'lms_data'])
	main(args)

if __name__ == '__main__':
	main()

