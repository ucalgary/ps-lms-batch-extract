// ------------------------------------------------------------
// Utility views
// ------------------------------------------------------------

exports.ps_to_bb_course_code = {
	map: function(doc) {
		if (doc['type'] == 'course') {
			var lmsutils = require('views/lib/lmsutils');
			var bb_code = lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']);

			emit(doc['sourcedid']['id'], bb_code);
		}
	}
}

exports.half_vs_full_courses = {
	map: function (doc) {
		if (doc['type'] == 'course') {
			var lmsutils = require('views/lib/lmsutils');
			var sub_num = lmsutils.subject_and_number_from_ps_code(doc['sourcedid']['id']);

			if (sub_num[1].match(/[\d]+[AB]+/)) {
				emit('full', doc['sourcedid']['id']);
			} else {
				emit('half', doc['sourcedid']['id']);
			}
		}
	}
}

// ------------------------------------------------------------
// Views for Desire2Learn Holding Tank
// ------------------------------------------------------------

// 1 Templates
exports.d2l_template = {
	map: function(doc) {
		if (doc['type'] == 'course') {
		    // Check for ContEd course code first
		    if(/^[A-Z][A-Z][A-Z]_[0-9][0-9][0-9]_[0-9][0-9][0-9]/.test(doc['sourcedid']['id'])){
			var template_id =  doc['sourcedid']['id'].replace(/_[0-9][0-9][0-9]$/g, "") // strip away lecture number
			var translated_doc = {
			    'id': template_id,
			    'description': {
				'short': template_id,
				'long': template_id,
			    },
			    'relationships': [ "CONTED" ] // department code
			} // end of translated_doc
		    } // end of processing D1 data
		    else // PS course
			{
			    var lmsutils = require('views/lib/lmsutils');
			    var subject_and_number = lmsutils.subject_and_number_from_ps_code(doc['sourcedid']['id']);
			    var base_number = /(\d+).*/.exec(subject_and_number[1])[1];
			    var suffix = '';
			    
			    // keep Qatar templates separate so that they are organized in their
			    // own faculty/department
			    if (doc['org']['id'] == 'QA') {
				suffix = 'Q';
			    }
			    
			    var translated_doc = {
				'id': subject_and_number[0] + '_' + base_number + suffix,
				'description': {
				                'short': subject_and_number[0] + '_' + base_number + suffix,
						'long': subject_and_number[0] + ' ' + base_number + suffix
				},
				'relationships': [
						  doc['org']['id']		// department code (eg: HA)
						  ]
			    } // end of translated_doc
			} // end of processing PS data
		    emit(translated_doc['id'], translated_doc);
		}
	},

	reduce: function(key, values, rereduce) {
		return values[0];
	}
}

// 2 Offerings and 3 Sections
exports.d2l_offering = {
	map: function(doc) {
	//if (doc['type'] == 'course' && doc['grouptype']['typevalue']['@level'] == '0') {

	// @level == 0 PeopleSoft, @level == 5 D1?
	if (doc['type'] == 'course' && (doc['grouptype']['typevalue']['@level'] == '0' || doc['grouptype']['typevalue']['@level'] == '5')) {
			var lmsutils = require('views/lib/lmsutils');

			// Check for ContEd course code first
			if(/^[A-Z][A-Z][A-Z]_[0-9][0-9][0-9]_[0-9][0-9][0-9]/.test(doc['sourcedid']['id'])){
			    var course_id = doc['sourcedid']['id'];
			    var translated_doc = {
				'id': course_id,
				'section_id': course_id + '_SEC',
				'description': {
				    'short': course_id,
				    'long': doc['description']['long']
				},
				'relationships': [
						  doc['relationship']['sourcedid'][1]['id'],				// semester (eg: CTED)
						  doc['relationship']['sourcedid'][0]['id']				// template (eg: ICT_680)
						  ],
				'section_relationships': [
							  lmsutils.get_course_code(('mapping' in doc) ? 
											doc['mapping']['sourcedid']['id'] :
										        doc['sourcedid']['id'], '')
							  ],
				'is_mapped': ('mapping' in doc)
			    } // end of translated_doc

			} // end of processing D1 data
			else // PS course
			    {
				var bb_course_components = lmsutils.ps_to_bb_course_components(doc['sourcedid']['id']);
				var bb_course_code = lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']);
				var semester_name = { 'P':'Spring', 'S':'Summer', 'F':'Fall', 'W':'Winter' }[bb_course_components[0]];
				var base_number = /(\d+).*/.exec(bb_course_components[3])[1];
				var short_prefix = bb_course_components[2] + ' '  // subject code (ENGL)
     				                 + bb_course_components[3] + ' '  // course number (201)
				                 + bb_course_components[4]        // single character section (L, B, T, S, C, P)
				                 + bb_course_components[5];       // section number (01)
				var long_prefix  = short_prefix
				                 + ' - ('
				                 + semester_name + ' '            // semester name (Spring, Summer, Fall, Winter)
				                 + bb_course_components[1]        // four digit year (2014)
				                 + ') - ';
				var translated_doc = {
				    'id': bb_course_code,
				    'section_id': bb_course_code + '_SEC',
				    'description': {
					'short': short_prefix,
					'long': long_prefix + doc['description']['long']
				    },
				    'relationships': [
						      doc['relationship']['sourcedid']['id'],				// semester (eg: 2141)
						      bb_course_components[2] + '_' + base_number			// template (eg: ACCT_217)
						      ],
				    'section_relationships': [
							      lmsutils.ps_to_bb_course_code(('mapping' in doc) ? 
											    doc['mapping']['sourcedid']['id'] :
											    doc['sourcedid']['id'])
							      ],
				    'is_mapped': ('mapping' in doc)
				} // end of translated_doc
			    } // end of processing PS data
			emit(doc._local_seq, translated_doc);
		}
	}
}

// 4 Users
exports.d2l_user = {
	map: function(doc) {
		if (doc['type'] == 'person') {
			var lmsutils = require('views/lib/lmsutils');
			var translated_doc = {
				'id': doc['userid'],
				'name': {
					'given': doc['name']['n']['given'],
					'family': doc['name']['n']['family']
				},
				'email': doc['email'],
				'datasource': doc['datasource'],
				'datetime': doc['datetime'],
				'attribute_revisions': doc['attribute_revisions']
			}
			var key = [
				doc['userid'],
				Math.floor(lmsutils.DateFromISOString(doc['datetime'])/ 1000)
			];

			emit(key, translated_doc);
		} else if (doc['type'] == 'member') {
			if (doc['datasource'] == 'PeopleSoft' && doc['role']['@roletype'] == '02') {
				var key = [
					doc['sourcedid']['id'],
					'ps_instructor'
				];

				emit(key, true)
			}
		}
	},

	reduce: function(key, values, rereduce) {
		var lmsutils = require('views/lib/lmsutils');
		var reduction = rereduce ? values[0] : {
			'ps': null,
			'd1': null,
			'is_ps_instructor': false
		};

		for (var i = rereduce ? 1 : 0; i < values.length; i++) {
			var value = values[i];

			if (typeof(value) == 'object') {
				var src_map = {
					'PeopleSoft': 'ps',
					'Destiny One': 'd1'	
				};
				var src_key = src_map[value['datasource']] || null;

				if (src_key == null) {
					continue;
				}

				var existing_datetime = lmsutils.DateFromISOString(reduction[src_key]['datetime']) || 0;
				var value_datetime = lmsutils.DateFromISOString(value['datetime']) || 0;
				
				if (value_datetime >= existing_datetime) {
					reduction[src_key] = value;
				}
			} else if (typeof(value) == 'boolean') {
				reduction['is_ps_instructor'] |= value;
			}
		}

		var canonical = reduction['ps'] || reduction['d1'];
		if (reduction['ps'] && reduction['d1']) {
			var interesting_keys = ['name', 'email'];
			for (var i = 0; i < interesting_keys.length; i++) {
				var key = interesting_keys[i];
				var ps_datetime = lmsutils.DateFromISOString(reduction['ps']['attribute_revisions'][key] || reduction['ps']['datetime']);
				var d1_datetime = lmsutils.DateFromISOString(reduction['d1']['attribute_revisions'][key] || reduction['d1']['datetime']);
				
				if (!(key == 'email' && reduction['is_ps_instructor']) && (d1_datetime > ps_datetime)) {
					canonical[key] = reduction['d1'][key];
				}
			}
		}
		reduction['canonical'] = canonical;

		return reduction;
	}
}

// 5 Enrollments
exports.d2l_enrollment = {
	map: function(doc) {
		if (doc['type'] == 'member') {
			var lmsutils = require('views/lib/lmsutils');
			var translated_doc = {
				'id': doc['sourcedid']['id'],
				//'membership_id': lmsutils.ps_to_bb_course_code(doc['membership_sourcedid']['id']) + '_SEC',
				'membership_id': lmsutils.get_course_code(doc['membership_sourcedid']['id'], '_SEC'),
				'role': {
					'roletype': doc['role']['@roletype'],
					'status': doc['role']['status']
				}
			}

			emit(doc._local_seq, translated_doc);
		}
	}
}

// List all mappings
exports.d2l_list_mappings = {
    map: function(doc) {
	if (doc['mapping']){
	    var lmsutils = require('views/lib/lmsutils');
	    var bb_code = lmsutils.get_course_code(doc['mapping']['sourcedid']['id']);
	    
	    var translated_doc = {
		'source' : {
		    'bb_code' : lmsutils.get_course_code(doc['sourcedid']['id']),
		    'ps_code' : doc['sourcedid']['id']
		},
		'destination' : {
		    'bb_code' : lmsutils.get_course_code(doc['mapping']['sourcedid']['id']),
		    'ps_code' : doc['mapping']['sourcedid']['id']
		}
	    }

	    emit(doc['sourcedid']['id'], translated_doc);
	}	
    }
}

// ------------------------------------------------------------
// Views for Atlas Systems Ares
// ------------------------------------------------------------

exports.ares_course = {
	map: function(doc) {
		if (doc['type'] == 'course' && doc['grouptype']['typevalue']['@level'] == '0') {
			var lmsutils = require('views/lib/lmsutils');
			var translated_doc = {
				'course_code_ps': doc['sourcedid']['id'],
				'course_code_bb': lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']),
				'name': doc['description']['long'],
				'semester': lmsutils.ps_to_ares_semester(doc['sourcedid']['id'])
			}

			emit([translated_doc['course_code_bb'], 0], translated_doc);
		} else if (doc['type'] == 'member' && doc['role']['@roletype'] == '02') {
			var lmsutils = require('views/lib/lmsutils');
			
			emit([lmsutils.ps_to_bb_course_code(doc['membership_sourcedid']['id']), 1], doc['sourcedid']['id']);
		}
	}
}

exports.ares_courseuser = {
	
}