// exports.ps_to_bb_course_code = function(ps_code) {
// 	// PS: 2137-UCALG_ENGL_201_LEC16-75668
// 	// BB: W2013ENGL201LEC116
	
// 	var ps_code_parts = ps_code.split('-');
// 	if (ps_code_parts.length != 3) return ps_code;
// 	var course_parts = ps_code_parts[1].split('_');
// 	if (course_parts.length != 4) return ps_code;

// 	var course_year = ps_code_parts[0].substring(0, 1) + '0' + ps_code_parts[0].substring(1, 3);
// 	var course_session = {3:'P', 5:'S', 7:'F', 1:'W'}[ps_code_parts[0].charAt(3)];

// 	return course_session + course_year + course_parts[1] + course_parts[2] + course_parts[3]
// }

exports.ps_to_bb_course_code = function(ps_code) {
	// PS: 2137-UCALG-ENGL-201-LEC16-75668
	// BB: W2013ENGL201LEC116

	var ps_code_parts = ps_code.split(/[-_]/);
	if (ps_code_parts.length != 6) return ps_code;
	var course_section_parts = /(\D+)(\d+)/.exec(ps_code_parts[4])

	var course_year = ps_code_parts[0].substring(0, 1) + '0' + ps_code_parts[0].substring(1, 3);
	var course_session = { 3:'P', 5:'S', 7:'F', 1:'W' }[ps_code_parts[0].charAt(3)];
	//var course_number = ps_code_parts[3].replace(/\D/g, '');
	var course_number = ps_code_parts[3];
	var course_section_type = { 'LEC':'L',
															'LECL':'L',
															'LAB':'B',
															'LABB':'B',
															'TUT':'T',
															'TUTT':'T',
															'SEMS':'S' }[course_section_parts[1]];
	var course_section_number = course_section_parts[2].replace(/\D/g, '');

	return course_session + course_year + ps_code_parts[2] + course_number + course_section_type + course_section_number;
}

exports.ps_to_ares_semester = function(ps_code) {
	// PS: 2137-UCALG-ENGL-201-LEC16-75668
	// BB: Winter 2013

	var ps_code_parts = ps_code.split(/[-_]/);
	if (ps_code_parts.length != 6) return ps_code;

	var course_year = ps_code_parts[0].substring(0, 1) + '0' + ps_code_parts[0].substring(1, 3);
	var course_session = { 1:'Winter', 3:'Spring', 5:'Summer', 7:'Fall' }[ps_code_parts[0].charAt(3)];

	return course_session + ' ' + course_year;
}

// exports.subject_and_number_from_ps_code = function(ps_code) {
// 	// PS: 2137-UCALG_ENGL_201_LEC16-75668

// 	var ps_code_parts = ps_code.split('-');
// 	if (ps_code_parts.length != 3) return [null, null];
// 	var course_parts = ps_code_parts[1].split('_');
// 	if (course_parts.length != 4) return [null, null];

// 	return [course_parts[1], course_parts[2]];
// }

exports.subject_and_number_from_ps_code = function(ps_code) {
	// PS: 2137-UCALG_ENGL_201_LEC16-75668

	var ps_code_parts = ps_code.split(/[-_]/);
	if (ps_code_parts.length != 6) return [null, null];

	return [ps_code_parts[2], ps_code_parts[3]];
}

exports.docs_equal = function(o1, o2) {
	// This is fast and limited.
	// If the key order changes, this will return false

	o1 = exports.remove_couch_md(o1);
	o2 = exports.remove_couch_md(o2);

	log('o1: ' + JSON.stringify(o1));
	log('o2: ' + JSON.stringify(o2));

	return JSON.stringify(o1) === JSON.stringify(o2);
}

exports.remove_couch_md = function(doc) {
	if (!'_rev' in doc) {
		return doc;
	}

	var mod_doc = {};
	for (var key in doc) {
		if (key != '_rev' && key != '_revisions') {
			mod_doc[key] = doc[key];
		}
	}
	return mod_doc;
}