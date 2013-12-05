// exports.translated_membership = {
// 	map: function(doc) {
// 		var lmsutils = require('views/lib/lmsutils');
// 		var translated_doc = {
// 			'_id': doc._id,
// 			'sourcedid': {
// 				'id': lmsutils.ps_to_bb_course_code(doc['sourcedid']['id'])
// 			},
// 			'member': []
// 		};

// 		// var roletype_mapping = {
// 		// 	'01': 'Student',
// 		// 	'02': 'Instructor'
// 		// };

// 		for (var member_idx in doc['member']) {
// 			var member = doc['member'][member_idx];
// 			var translated_member = {
// 				'sourcedid': member['sourcedid'],
// 				'role': {
// 					// 'roletype': roletype_mapping[member['role']['@roletype']],
// 					'roletype': member['role']['@roletype'],
// 					'status': member['role']['status']
// 				}
// 			}

// 			translated_doc['member'].push(translated_member);
// 		}

// 		emit(doc._local_seq, translated_doc);
// 	}
// }

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
			var translated_doc = {
				'id': subject_and_number[0] + '_' + base_number,
				'description': {
					'short': subject_and_number[0] + '_' + base_number,
					'long': subject_and_number[0] + ' ' + base_number
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
		if (doc['type'] = 'course' && doc['grouptype']['typevalue']['@level'] == '0') {
			var lmsutils = require('views/lib/lmsutils');
			var subject_and_number = lmsutils.subject_and_number_from_ps_code(doc['sourcedid']['id']);
			var base_number = /(\d+).*/.exec(subject_and_number[1])[1];
			var translated_doc = {
				'id': lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']),
				'section_id': lmsutils.ps_to_bb_course_code(doc['sourcedid']['id']) + '_SEC',
				'description': {
					'short': doc['description']['short'],
					'long': doc['description']['long']
				},
				'timeframe': {
					'begin': doc['timeframe']['begin']['#text'],
					'end': doc['timeframe']['end']['#text']
				},
				'relationships': [
					doc['relationship']['sourcedid']['id'],				// semester (eg: 2141)
					subject_and_number[0] + '_' + base_number			// template (eg: ACCT_217)
				],
				'section_relationships': [
					lmsutils.ps_to_bb_course_code(('mapping' in doc) ? 
					                              doc['mapping']['sourcedid']['id'] :
					                              doc['sourcedid']['id'])
				]
			}

			emit(doc._local_seq, translated_doc);
		}
	}
}

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