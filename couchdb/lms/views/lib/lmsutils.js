// determines what to do with course ID
exports.get_course_code = function(raw_id, ps_suffix) {
    var course_id = '';
    
    // Check for ContEd course code first
    if(/^[A-Z][A-Z][A-Z]_[0-9][0-9][0-9]_[0-9][0-9][0-9]/.test(raw_id)){
	// no conversion necessary from D1
	course_id = raw_id;
    }
    else{
	// PeopleSoft format -- convert to Blackboard format
	course_id = exports.ps_to_bb_course_code(raw_id) + ps_suffix;
    }

    return course_id;
}

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

    var bb_course_components = exports.ps_to_bb_course_components(ps_code);
    bb_course_components[4] = bb_course_components[4].replace(/A/g, "AB");     // convert A courses into AB
    
    return bb_course_components.join('').replace(/\./g, "");

}

exports.ps_to_bb_course_components = function(ps_code) {
	var ps_code_parts = ps_code.split(/[-_]/);
	if (ps_code_parts.length != 6) return null;
	var course_section_parts = /(\D+)(.*)/.exec(ps_code_parts[4])

	var course_year = ps_code_parts[0].substring(0, 1) + '0' + ps_code_parts[0].substring(1, 3);
	var course_session = { 3:'P', 5:'S', 7:'F', 1:'W' }[ps_code_parts[0].charAt(3)];
	var course_number = ps_code_parts[3].replace(/[AB]/g, "");
	var course_AB = ps_code_parts[3].replace(/[0-9]/g, "");  // is this an A/B section or neither?
	var course_section_type = { 'LEC':'L',
															'LECL':'L',
															'LAB':'B',
															'LABB':'B',
															'TUT':'T',
															'TUTT':'T',
															'SEMS':'S',
															'SEM':'S',
															'ALL':'ALL' }[course_section_parts[1]];
	var course_section_number = course_section_parts[2].replace(/\D/g, '');
	
	return [course_session,					// 0: single character semester (P, S, F, W)
	        course_year,					// 1: four digit year (2014)
	        ps_code_parts[2],				// 2: subject code (ENGL)
	        course_number,					// 3: course number (201)
		course_AB,                                      // 4: A/B section or neither
	        course_section_type,                            // 5: single character section (L, B, T, S, C, P)
	        course_section_number]                          // 6: section number (01)
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

exports.ps_docs_equal = function(o1, o2) {
	// This is fast and limited.
	// If the key order changes, this will return false

	o1 = exports.remove_non_ps_md(o1);
	o2 = exports.remove_non_ps_md(o2);

	// log('o1: ' + JSON.stringify(o1));
	// log('o2: ' + JSON.stringify(o2));

	return JSON.stringify(o1) === JSON.stringify(o2);
}

exports.remove_non_ps_md = function(doc) {
	if (!(typeof(doc) == 'object')) {
		return doc;
	}

	if (!('_rev' in doc)) {
		return doc;
	}

	var mod_doc = {};
	for (var key in doc) {
		if (key.charAt(0) != '_' && key != 'mapping' && key != 'datetime' && key != 'attribute_revisions' && key != 'lmsexport') {
			mod_doc[key] = doc[key];
		}
	}
	return mod_doc;
}

// from http://stackoverflow.com/questions/6228302/javascript-date-iso8601
exports.DateFromISOString = function(s) {
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
}

// based on polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
exports.DateToISOString = function(d) {
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