// ------------------------------------------------------------
// Utility views
// ------------------------------------------------------------

exports.course_information = {
	map: function(doc) {
		if (doc['type'] == 'course') {
			var lmsutils = require('views/lib/lmsutils');
			var bb_code = lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']);
			var sub_num = lmsutils.subject_and_number_from_ps_code(doc['sourcedid']['id']);

			var result = {
				'bb_code': bb_code,
				'half_or_full': sub_num[1].match(/[\d]+[AB]+/) ? 'full' : 'half'
			};

			emit(doc['sourcedid']['id'], result);
		}
	}
}

// ------------------------------------------------------------
// Processed information for export to Desire2Learn and Ares
// ------------------------------------------------------------

exports.processed_courses = {
	map: function(doc) {
		var lmsutils = require('views/lib/lmsutils');

		if (doc['type'] == 'course') {
			var data = {};

			// Parse the course code into its constituent parts
			data['code_info'] = lmsutils.course_code_parse(doc['sourcedid']['id']);

			// Create identifiers for this course's D2L template, offering, and section
			var template_id = data['code_info']['subject_and_number'].replace(' ', '_');
			var template_id_dot_idx = template_id.lastIndexOf('.');
			if (template_id_dot_idx != -1) {
				template_id = template_id.substring(0, template_id_dot_idx);
			}
			data['d2l_identifiers'] = {
				'template': template_id,
				'offering': data['code_info']['canonical_course_code'],
				'section': data['code_info']['canonical_course_code'] + '_SEC'
			};

			data['is_mapped'] = 'mapping' in doc;

			// Relate D2L offerings and sections to their appropriate parents
			// Template parents differ between PeopleSoft and Destiny One
			data['d2l_relationships'] = {
				'offering': [
					data['code_info']['semester'],															// semester (eg: 2141)
					data['code_info']['subject_and_number'].replace(' ', '_')		// template (eg: ACCT_217)
				],
				'section': [
					lmsutils.course_code_parse('mapping' in doc ? doc['mapping']['sourcedid']['id'] : doc['sourcedid']['id'])['canonical_course_code']
				]
			}
			if (data['code_info']['system'] == 'PeopleSoft') {
				data['d2l_relationships']['template'] = [
					doc['org']['id']
				];
			} else if (data['code_info']['system'] == 'Destiny One') {
				data['d2l_relationships']['template'] = [
					'CONTED'
				];
			}

			emit([data['code_info']['system'], data['code_info']['system_course_code']], data);
		} else if (doc['type'] == 'member' && doc['role']['@roletype'] == '02') {
			var code_info = lmsutils.course_code_parse(doc['membership_sourcedid']['id']);

			emit([code_info['system'], code_info['system_course_code'], 'instructor'], doc['sourcedid']['id']);
		}
	} 
}

exports.processed_memberships = {
	map: function(doc) {
		if (doc['type'] == 'member') {
			var lmsutils = require('views/lib/lmsutils');
			var data = {};

			// Parse the course code
			var code_info = lmsutils.course_code_parse(doc['membership_sourcedid']['id']);
			var system_course_code = code_info['system_course_code'];
			
			var member_id = doc['role']['userid'];
			data['member'] = member_id;

			// Populate membership and role information
			data['membership_d2l_identifiers'] = {
				'template': code_info['subject_and_number'].replace(' ', '_'),
				'offering': code_info['canonical_course_code'],
				'section': code_info['canonical_course_code'] + '_SEC'
			};
			data['role'] = {
				'roletype': doc['role']['@roletype'],
				'status': doc['role']['status'],
				'ares_rolename': (doc['role']['@roletype'] == '02') ? 'Instructor' : 'User'
			};

			// emit([system_course_code, member_id], data);
			emit(system_course_code, data);
		}
	}

	// reduce: function(key, values, rereduce) {
	// 	var members = [];
	// 	var combined_data = {
	// 		'membership_d2l_identifiers': values[0]['membership_d2l_identifiers'],
	// 		'members': members
	// 	};
		
	// 	for (var i =  0; i < values.length; i++) {
	// 		var value = values[i];
	// 		if (rereduce) {
	// 			members.push.apply(members, value['members']);
	// 		} else {
	// 			members.push({
	// 				'member': value['member'],
	// 				'role': value['role']
	// 			});
	// 		}
	// 	}

	// 	return combined_data;
	// }
}

exports.processed_people = {
	map: function(doc) {
		if (doc['type'] == 'person') {
			var lmsutils = require('views/lib/lmsutils');
			var src_map = {
				'PeopleSoft': 'ps',
				'Destiny One': 'd1'	
			};
			var src_key = src_map[doc['datasource']] || null;
			var details = {
				'name': doc['name'],
				'email': doc['email'],
				'datetime': Math.floor(lmsutils.DateFromISOString(doc['datetime'] / 1000)),
				'attribute_revisions': doc['attribute_revisions']
			};
			var data = {
				'ps': null,
				'd1': null,
				'is_ps_instructor': false
			};
			data[src_key] = details;

			emit([doc['userid']], data);
		} else if (doc['type'] == 'member') {
			if (doc['datasource'] == 'PeopleSoft' && doc['role']['@roletype'] == '02') {
				var key = [
					doc['role']['userid'],
					'is_ps_instructor'
				];

				emit(key, true);
			}
		}
	},

	reduce: function(keys, values, rereduce) {
		var reduction = {
			'ps': null,
			'd1': null,
			'is_ps_instructor': false
		};

		// If there is exactly one value and it's an object, shortcut the process
		// and return that value, also setting the canonical
		if (values.length == 1 && typeof(values[0]) == 'object') {
			var value = values[0];
			var src_keys = ['ps', 'd1'];

			for (var j = 0; j < src_keys.length; j++) {
				var src_key = src_keys[j];

				if (value[src_key] != null) {
					reduction['canonical'] = value[src_key];
					break;
				}
			}

			return reduction;
		}

		for (var i = 0; i < values.length; i++) {
			var value = values[i];
			if (value == null) {
				continue;
			}

			if (typeof(value) == 'object') {
				var src_keys = ['ps', 'd1'];

				for (var j = 0; j < src_keys.length; j++) {
					var src_key = src_keys[j];

					if (reduction[src_key] == null || (value[src_key]['datetime'] >= reduction[src_key]['datetime'])) {
						reduction[src_key] = value[src_key];
					}
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
				var ps_datetime = reduction['ps']['attribute_revisions'][key] || reduction['ps']['datetime'];
				var d1_datetime = reduction['d1']['attribute_revisions'][key] || reduction['d1']['datetime'];

				if (!(key == 'email' && reduction['is_ps_instructor']) && (d1_datetime > ps_datetime)) {
					canonical[key] = reduction['d1'][key];
				}
			}
		}
		reduction['canonical'] = canonical;

		return reduction;
	}
}

// ------------------------------------------------------------
// Views for Desire2Learn Holding Tank
// ------------------------------------------------------------

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
