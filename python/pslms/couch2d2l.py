#!/usr/bin/env python
# coding=utf-8

import datetime
import subprocess
import sys
import tempfile

from pslms.base import LMSObject


class Couch2D2L(LMSObject):

	feed_properties = {
		'templates': {
			'name_format': '1-Templates_%(year)s-%(month)s-%(day)s.xml',
			'done_format': '1-Templates_%(year)s-%(month)s-%(day)s.alldone',
			'design_doc': 'lms',
			'list': 'xml4_template',
			'view': 'd2l_template?group=True'
		},
		'offerings': {
			'name_format': '2-Offerings_%(year)s-%(month)s-%(day)s.xml',
			'done_format': '2-Offerings_%(year)s-%(month)s-%(day)s.alldone',
			'design_doc': 'lms',
			'list': 'xml4_offering',
			'view': 'd2l_offering'
		},
		'sections': {
			'name_format': '3-Sections_%(year)s-%(month)s-%(day)s.xml',
			'done_format': '3-Sections_%(year)s-%(month)s-%(day)s.alldone',
			'design_doc': 'lms',
			'list': 'xml4_section',
			'view': 'd2l_offering'
		},
		'users': {
			'name_format': '4-Users_%(year)s-%(month)s-%(day)s.xml',
			'done_format': '4-Users_%(year)s-%(month)s-%(day)s.alldone',
			'design_doc': 'lms',
			'list': 'xml4_user',
			'view': 'd2l_user'
		},
		'enrollments': {
			'name_format': '5-Enrollments_%(year)s-%(month)s-%(day)s.xml',
			'done_format': '5-Enrollments_%(year)s-%(month)s-%(day)s.alldone',
			'design_doc': 'lms',
			'list': 'xml4_enrollment',
			'view': 'd2l_enrollment'
		}
	}

	def argument_parser(self):
		parser = super(Couch2D2L, self).argument_parser()

		parser.add_argument('db', help='CouchDB connection name')
		parser.add_argument('feed', help='D2L XML4 feed name')
		parser.add_argument('--upload', action='store_true', help='upload to D2L Holding Tank')
		parser.add_argument('--write', action='store_true', help='write to file')

		return parser

	def main(self):
		args = self.args
		feed_properties = Couch2D2L.feed_properties[args.feed]

		db_url = self._connection_info.get(self.args.db, {}).get('url')
		if not db_url: sys.exit('CouchDB connection named ' + self.args.db + ' not found')

		# Construct the URL that feed will be read from
		feed_url = db_url + '/_design/%(design_doc)s/_list/%(list)s/%(view)s' % feed_properties

		# Construct the output names for the feed
		today = datetime.date.today()
		substitutions = {'year':today.year, 'month':today.month, 'day':today.day}
		feed_name = feed_properties['name_format'] % substitutions
		done_name = feed_properties['done_format'] % substitutions

		print feed_url
		print feed_name
		print done_name

def main(args=None):
	Couch2D2L(
		args = args,
		connection_info = {
			'lms_data': {
				'url': 'http://127.0.0.1:5984/lms-data'
			}
		}
	).run()

def templates_main():
	args = sys.argv[1:]
	args.extend(['lms_data', 'templates'])
	main(args)

def offerings_main():
	args = sys.argv[1:]
	args.extend(['lms_data', 'offerings'])
	main(args)

def sections_main():
	args = sys.argv[1:]
	args.extend(['lms_data', 'sections'])
	main(args)

def users_main():
	args = sys.argv[1:]
	args.extend(['lms_data', 'users'])
	main(args)

def enrollments_main():
	args = sys.argv[1:]
	args.extend(['lms_data', 'enrollments'])
	main(args)

if __name__ == '__main__':
	main()
