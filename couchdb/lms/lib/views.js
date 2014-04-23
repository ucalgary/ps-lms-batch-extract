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
			}

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
	if (doc['type'] == 'course' && doc['grouptype']['0']['typevalue']['@level'] == '0') {

			var lmsutils = require('views/lib/lmsutils');
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
				+ bb_course_components[5]        // single character section (L, B, T, S, C, P)
				+ bb_course_components[6];       // section number (01)
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
						  bb_course_components[2] + '_' + base_number + suffix		// template (eg: ACCT_217)
						  ],
				'section_relationships': [
							  lmsutils.ps_to_bb_course_code(('mapping' in doc) ? 
											doc['mapping']['sourcedid']['id'] :
											doc['sourcedid']['id'])
							  ],
				'is_mapped': ('mapping' in doc)
			    }
			    
			    emit(doc._local_seq, translated_doc);
			} // end of Lecture, Seminar, and exceptions
	} // end of doc processing
    } // end of map function
} // end of function def

// 4 Users
exports.d2l_user = {
	map: function(doc) {
		if (doc['type'] == 'person') {
			var translated_doc = {
				'id': doc['userid'],
				'name': {
					'given': doc['name']['n']['given'],
					'family': doc['name']['n']['family']
				},
				'email': doc['email']
			}

			emit(doc._local_seq, translated_doc);
		}
	}
}

// 5 Enrollments
exports.d2l_enrollment = {
	map: function(doc) {
		if (doc['type'] == 'member') {
			var lmsutils = require('views/lib/lmsutils');
			var translated_doc = {
				'id': doc['sourcedid']['id'],
				'membership_id': lmsutils.ps_to_bb_course_code(doc['membership_sourcedid']['id']) + '_SEC',
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
	    var bb_code = lmsutils.ps_to_bb_course_code(doc['mapping']['sourcedid']['id']);
	    
	    var translated_doc = {
		'source' : {
		    'bb_code' : lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']),
		    'ps_code' : doc['sourcedid']['id']
		},
		'destination' : {
		    'bb_code' : lmsutils.ps_to_bb_course_code(doc['mapping']['sourcedid']['id']),
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

// ------------------------------------------------------------
// Views for Atlas Systems Ares
// ------------------------------------------------------------

exports.ares_course = {
	map: function(doc) {
		if (doc['type'] == 'course' && doc['grouptype']['0']['typevalue']['@level'] == '0') {
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