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
			    var base_number = subject_and_number[1].replace(/\D/g,'');     // just get the digits
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
	if (doc['type'] == 'course'){
		var lmsutils = require('views/lib/lmsutils');
		
		// Process ContEd courses
		if(doc['datasource'] == "Destiny One"){

			// this if statement probably isn't needed, but still...
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
			} // end of filtering Cont Ed course ID
			emit(doc._local_seq, translated_doc);
		} // end of processing D1 data

		// Process PeopleSoft courses
		else if(doc['datasource'] == "PeopleSoft"){  
			if(doc['grouptype']['0']['typevalue']['@level'] == '0') {   // only do grouptype CLASSES
				var bb_course_components = lmsutils.ps_to_bb_course_components(doc['sourcedid']['id']);

				// only output Lectures, Seminars, and exceptions
				if((bb_course_components[5] == 'L' || bb_course_components[5] == 'S' || doc['lmsexport']['include'] == '1') &&
				   // don't process "B" sections
				   (bb_course_components[4] == 'A' || bb_course_components[4] == '')){
					
					var suffix = '';
					
					// keep Qatar templates separate so that they are organized in their
					// own faculty/department
					if (doc['org']['id'] == 'QA') {
						suffix = 'Q';
					}

					var bb_course_code = lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']);
					var semester_name = { 'P':'Spring', 'S':'Summer', 'F':'Fall', 'W':'Winter' }[bb_course_components[0]];
					var base_number = /(\d+).*/.exec(bb_course_components[3])[1];
					var short_prefix = bb_course_components[2] + ' '  // subject code (ENGL)
			 		                 + bb_course_components[3]        // course number (201)
					                 + bb_course_components[4].replace(/A/g, "AB") + ' '  // AB course if applicable
					                 + bb_course_components[5]		// single character section (L, B, T, S, C, P)
					                 + bb_course_components[6];	   // section number (01)
					var long_prefix  = short_prefix
									         + ' - ('
									         + semester_name + ' '			// semester name (Spring, Summer, Fall, Winter)
									         + bb_course_components[1]		// four digit year (2014)
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
								  bb_course_components[2] + '_' + base_number + suffix			// template (eg: ACCT_217)
								  ],
						'section_relationships': [
									  lmsutils.ps_to_bb_course_code(('mapping' in doc) ? 
													doc['mapping']['sourcedid']['id'] :
													doc['sourcedid']['id'])
									  ],
						'is_mapped': ('mapping' in doc)
					} // end of translated_doc
					emit(doc._local_seq, translated_doc);			
				} // end of filtering "B" courses
			} // end of doc['grouptype']['typevalue']['@level'] == '0'
		} // end of processing PS data
	} // end of type == course
    } // end of mapping function
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
		var DateFromISOString = function(s) {
			var day, tz,
			rx =/^(\d{4}\-\d\d\-\d\d([tT][\d:\.]*)?)([zZ]|([+\-])(\d\d):(\d\d))?$/,
			p = rx.exec(s) || [];

			if (p[1]){
				day=  p[1].split(/\D/);
				for (var i = 0, L = day.length; i < L; i++) {
					day[i]= parseInt(day[i], 10) || 0;
				}
				day[1] -= 1;
				day = new Date(Date.UTC.apply(Date, day));
				if (!day.getDate()) return NaN;
				if (p[5]){
					tz = (parseInt(p[5], 10) * 60);
					if (p[6]) tz+= parseInt(p[6], 10);
					if (p[4] == '+') tz *= -1;
					if (tz) day.setUTCMinutes(day.getUTCMinutes() + tz);
				}
				return day;
			}
			return NaN;
		};

		var DateToISOString = function(d) {
			function pad(number) {
				if (number < 10) {
					return '0' + number;
				}

				return number;
			}

			return d.getUTCFullYear() +
				'-' + pad(d.getUTCMonth() + 1) +
				'-' + pad(d.getUTCDate()) + 
				'T' + pad(d.getUTCHours()) +
				':' + pad(d.getUTCMinutes()) +
				':' + pad(d.getUTCSeconds()) +
				'.' + (d.getUTCMilliseconds() / 1000).toFixed(3).slice(2,5) +
				'Z';
		}

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

				if (reduction[src_key] != null) {
					var existing_datetime = DateFromISOString(reduction[src_key]['datetime']) || 0;
					var value_datetime = DateFromISOString(value['datetime']) || 0;	
				}
				
				if (reduction[src_key] == null || (value_datetime >= existing_datetime)) {
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
				var ps_datetime = DateFromISOString(reduction['ps']['attribute_revisions'][key] || reduction['ps']['datetime']);
				var d1_datetime = DateFromISOString(reduction['d1']['attribute_revisions'][key] || reduction['d1']['datetime']);
				
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
	    var bb_code = lmsutils.get_course_code(doc['mapping']['sourcedid']['id'], '');
	    
	    var translated_doc = {
		'source' : {
		    'bb_code' : lmsutils.get_course_code(doc['sourcedid']['id'], ''),
		    'ps_code' : doc['sourcedid']['id']
		},
		'destination' : {
		    'bb_code' : lmsutils.get_course_code(doc['mapping']['sourcedid']['id'], ''),
		    'ps_code' : doc['mapping']['sourcedid']['id']
		}
	    }

	    emit(doc['sourcedid']['id'], translated_doc);
	}	
    }
}


// List non-enrollment components that are added to D2L
exports.d2l_list_lab_tutorial_inclusions = {
    map: function(doc) {
	if (doc['type'] == 'course' && doc['lmsexport']['include'] == '1'){
	    var lmsutils = require('views/lib/lmsutils');

	    var translated_doc = {
		'bb_code' : lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']),
		'ps_code' : doc['sourcedid']['id']
	    }

	    emit(doc['sourcedid']['id'], translated_doc);
	} // end of document match
    }
}


// list courses that we allow to be sent to the holding tank
exports.d2l_list_courses_to_holding_tank = {
    map: function(doc) {
	if (doc['type'] == 'course') {
	    var lmsutils = require('views/lib/lmsutils');
            var bb_course_components = lmsutils.ps_to_bb_course_components(doc['sourcedid']['id']);
	    
	    // only output Lectures, Seminars, and exceptions
	    if((bb_course_components[5] == 'L' || bb_course_components[5] == 'S' || doc['lmsexport']['include'] == '1') && 
	       // don't process "B" sections
               (bb_course_components[4] == 'A' || bb_course_components[4] == '')){
		
		// output (unprocessed) course ID and component type
		emit(doc['sourcedid']['id'],[doc['sourcedid']['id'], bb_course_components[5]]);
	    } // end of Lectures/Seminars/Exceptions
	} // end of doc processing
    } // end of map function
} // end of function def


// generate course copy batch (CCB) file
exports.d2l_make_ccb = {
    map: function(doc) {
	if (doc['type'] == 'course' && doc['grouptype']['0']['typevalue']['@level'] == '0') {
	    var lmsutils = require('views/lib/lmsutils');
	    var bb_course_components = lmsutils.ps_to_bb_course_components(doc['sourcedid']['id']);

	    // only output Lectures, Seminars, and exceptions
	    if((bb_course_components[5] == 'L' || bb_course_components[5] == 'S' || doc['lmsexport']['include'] == '1') &&
	       // don't process "B" sections
	       (bb_course_components[4] == 'A' || bb_course_components[4] == '')){
		
		var subject_and_number = lmsutils.subject_and_number_from_ps_code(doc['sourcedid']['id']);
		var base_number = /(\d+).*/.exec(subject_and_number[1])[1];
		var suffix = '';
		
		// keep Qatar templates separate so that they are organized in their
		// own faculty/department
		if (doc['org']['id'] == 'QA') {
		    suffix = 'Q';
		}
		
		var translated_doc = {
		    'dest_dept' : doc['org']['id'],
		    'dest_name' : doc['description']['short'].replace(/,/g, ""),
		    'dest_id' : lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']),
		    'dest_template' : subject_and_number[0] + '_' + base_number + suffix
		}
		
		emit(doc['sourcedid']['id'], translated_doc);
	    } // end of Lecture, Seminar, and exceptions
	} // end of doc processing
    } // end of map function
} // end of function def


// mailing list of PeopleSoft instructors
exports.d2l_ps_instructor_mlist = {
    map: function(doc) {
	var lmsutils = require('views/lib/lmsutils');
	
	if (doc['type'] == 'member' && doc['role']['status'] == "1" && doc['role']['@roletype'] == "02" && doc['datasource'] == "PeopleSoft") {
	    var translated_doc = {
		'id': doc['sourcedid']['id'],
		'email': doc['role']['email'],
		'courseid': lmsutils.get_course_code(doc['membership_sourcedid']['id'], ''),
		'datasource': doc['datasource']
	    }
	    emit(doc['membership_sourcedid']['id'], translated_doc);
	} // end of instructor filtering
	else if (doc['type'] == 'course' && doc['datasource'] == "PeopleSoft") {
	    var bb_course_components = lmsutils.ps_to_bb_course_components(doc['sourcedid']['id']);
	    
	    // only output Lectures, Seminars, and exceptions
	    if((bb_course_components[5] == 'L' || bb_course_components[5] == 'S' || doc['lmsexport']['include'] == '1') && 
	       // don't process "B" sections
	       (bb_course_components[4] == 'A' || bb_course_components[4] == '')){
		
		//emit(doc['sourcedid']['id'],[doc['sourcedid']['id'], bb_course_components[5]]);
		emit(doc['sourcedid']['id'], true);
	    } // end of Lectures/Seminars/Exceptions
	} // end of doc processing
    }, // end of map function

    reduce: function(key, values, rereduce) {
	var reduction = rereduce ? values[0] : {
	    'user': null,
	    'is_in_ht': false
	};

	for (var i = rereduce ? 1 : 0; i < values.length; i++) {
	    var value = values[i];
	    
	    if (typeof(value) == 'object') {
		reduction['user'] = value;
	    } else if (typeof(value) == 'boolean') {
		reduction['is_in_ht'] = value;
	    }
	}

	// only return instructor info for courses that are in the holding tank
	if(reduction['user'] != null && reduction['is_in_ht'] == true){
	    return reduction;
	}
    } // end of reduce function

} // end of function def
    


// mailing list of ContEd instructors
exports.d2l_d1_instructor_mlist = {
    map: function(doc) {
	var translated_doc;

	// just get the instructors
	if (doc['type'] == 'member' && doc['role']['status'] == "1" && doc['role']['@roletype'] == "02" && doc['datasource'] == "Destiny One") {
	    translated_doc = {
		'id': doc['sourcedid']['id'],
		'courseid': doc['membership_sourcedid']['id'],
		'datasource': doc['datasource'],
		'type': doc['type']
	    }
	    emit(doc['sourcedid']['id'], translated_doc);
	}
	else if (doc['type'] == 'person' && doc['datasource'] == "Destiny One") {  // get the user info
	    translated_doc = {
		'email': doc['email'],
		'type': doc['type']
	    }	    
	    emit(doc['userid'], translated_doc);
	} // end of Lectures/Seminars/Exceptions
    }, // end of map function

    reduce: function(key, values, rereduce) {
	var reduction = rereduce ? values[0] : {
	    'instructor': null,
	    'user': null
	};

	for (var i = rereduce ? 1 : 0; i < values.length; i++) {
	    var value = values[i];
	    
	    if (typeof(value) == 'object') {
		var src_map = {
		    'member': 'instructor',
		    'person': 'user'
		};

		var src_key = src_map[value['type']] || null;
		
		if (src_key == null) {
		    continue;
		}

		if (reduction[src_key] == null) {
		    reduction[src_key] = value;
		}
	    }
	}

	// only return instructor info
	if(reduction['instructor'] != null && reduction['user']['email'] != null){
	    return reduction;
	}
    } // end of reduce function
} // end of function def
    


// ------------------------------------------------------------
// Views for Atlas Systems Ares
// ------------------------------------------------------------

exports.ares_course = {
	map: function(doc) {
		var lmsutils = require('views/lib/lmsutils');

		if (doc['type'] == 'course') {
			if (doc['datasource'] == 'Destiny One') {
				var translated_doc = {
					'semester': doc['relationship']['sourcedid'][1]['id'],
					'courseId': doc['sourcedid']['id'],
					'name': doc['description']['long']
				};

				emit([doc['sourcedid']['id'], 0], translated_doc);
			} else if (doc['datasource'] == 'PeopleSoft') {
				var bb_course_components = lmsutils.ps_to_bb_course_components(doc['sourcedid']['id']);
					
				if (bb_course_components[5] == 'L') {
					var translated_doc = {
						'semester': lmsutils.ps_to_ares_semester(doc['sourcedid']['id']),
						'courseId': lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']),
						'name': doc['description']['long']
					};

					emit([translated_doc['courseId'], 0], translated_doc);
				}
			}
		} else if (doc['type'] == 'member' && doc['role']['@roletype'] == '02') {
			var courseId = null;
			if (doc['datasource'] == 'Destiny One') {
				courseId = doc['membership_sourcedid']['id'];
				courseId = courseId.substring(0, courseId.length - 4);
				emit([courseId, 1], doc['sourcedid']['id']);
			} else {
				courseId = lmsutils.ps_to_bb_course_code(doc['membership_sourcedid']['id']);
				var bb_course_components = lmsutils.ps_to_bb_course_components(doc['membership_sourcedid']['id']);

				if (bb_course_components[5] == 'L') {
					emit([courseId, 1], doc['sourcedid']['id']);
				}
			}
		}
	},

	reduce: function(key, values, rereduce) {
		var reduction = rereduce ? values[0] : {
			'course': null,
			'instructor': null
		}

		for (var i = (rereduce) ? 1 : 0; i < values.length; i++) {
			var v = values[i];

			if (v.substring) {
				if (reduction['instructor'] == null) {
					reduction['instructor'] = v;
				}
			} else {
				reduction['course'] = v;
			}
		}

		return reduction;
	}
}

exports.ares_courseuser = {
	map: function(doc) {
		if (doc['type'] == 'member' && doc['role']['status'] == '1') {
			var lmsutils = require('views/lib/lmsutils');
			var translated_doc = {
				'id': doc['sourcedid']['id'],
				'membership_id': lmsutils.get_course_code(doc['membership_sourcedid']['id'], ''),
				'role': {
					'roletype': (doc['role']['@roletype'] == '02') ? 'Instructor' : 'User',
					'status': doc['role']['status']
				}
			}

			if (translated_doc['membership_id'].indexOf('_SEC', translated_doc['membership_id'].length - 4) !== -1) {
				translated_doc['membership_id'] = translated_doc['membership_id'].substring(0, translated_doc['membership_id'].length - 4);
			}

			emit(doc._local_seq, translated_doc);
		}
	}
}