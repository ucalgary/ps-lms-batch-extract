#!/usr/bin/env python
# coding=utf-8

import os
import sys

from setuptools import setup, find_packages

if not hasattr(sys, 'version_info') or sys.version_info < (2, 6, 0, 'final'):
	sys.exit('pslms requires Python 2.6 or later.')

setup(
	name = 'pslms',
	version = '0.1',

	author = 'King Chung Huang',
	author_email = 'kchuang@ucalgary.ca',
	description = 'Processing scripts to support PeopleSoft LMS to D2L data feeds.',

	packages = find_packages(),
	#include_package_date = True,
	install_requires = [
		'CouchDB>=0.9',
		'python_daemon>=1.6',
		'argparse>=1.1',
		'lxml>=3.3.5',
		'pytz'
	],

	entry_points = {
		'console_scripts': [
			'ps2couch = pslms.ps2couch:main',

			'export-d2l-templates = pslms.couch2d2l:templates_main',
			'export-d2l-offerings = pslms.couch2d2l:offerings_main',
			'export-d2l-users = pslms.couch2d2l:users_main',
			'export-d2l-enrollments = pslms.couch2d2l:enrollments_main',

			'ce2couch = pslms.ce2couch:main'
		]
	},

	zip_safe = True
)