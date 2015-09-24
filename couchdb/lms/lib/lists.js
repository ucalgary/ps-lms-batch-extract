var templates = require('duality/templates');

// ------------------------------------------------------------
// XML4 lists for Desire2Learn Holding Tank
// ------------------------------------------------------------

// 1 Templates
exports.xml4_template = function(head, req) {
	var template_predicate = function(row) {
		return (row.key.length == 2) &&
		       (!row.value['is_mapped']) &&
		       (row.value['code_info']['components'][5] == 'L' || row.value['code_info']['components'][5] == 'S' || row.value['is_included'] == true || row.value['code_info']['system'] == 'Destiny One') &&
		       (row.value['code_info']['components'][4] != 'B')
	}

	// keep track of all templates we have so far
	var templates = [];

	var template_check = function(previous_row, row) {
	    var template_name = row.value['d2l_identifiers']['template'];
	    
	    // this is a new template we don't have yet
	    if(templates.indexOf(template_name) == -1) {
		templates.push(template_name);		    
		return true;
	    } else {
		// repeat template
		return false;
	    }
	}
	
	exports.xml4_document(head, req, 'xml4_template.xml', template_predicate, template_check);
}

// 2 Offerings
exports.xml4_offering = function(head, req) {
	var offering_predicate = function(row) {
		return (row.key.length == 2) &&
		       (!row.value['is_mapped']) &&
		       (row.value['code_info']['components'][5] == 'L' || row.value['code_info']['components'][5] == 'S' || row.value['is_included'] == true || row.value['code_info']['system'] == 'Destiny One') &&
		       (row.value['code_info']['components'][4] != 'B')
	}

	var section_concatenator = function(previous_row, row) {
		var section = '';
		if (row.value['code_info']['components'][5] != null)
			section += row.value['code_info']['components'][5];
		if (row.value['code_info']['components'][6] != null)
			section += row.value['code_info']['components'][6];
		row.value['code_info']['course_section'] = section;

		return true;
	}

	exports.xml4_document(head, req, 'xml4_offering.xml', offering_predicate, section_concatenator);
}

// 3 Sections
exports.xml4_section = function(head, req) {
	var section_predicate = function(row) {
		return (row.key.length == 2) &&
		       (row.value['code_info']['components'][5] == 'L' || row.value['code_info']['components'][5] == 'S' || row.value['is_included'] == true || row.value['code_info']['system'] == 'Destiny One') &&
		       (row.value['code_info']['components'][4] != 'B')
	}

	var section_concatenator = function(previous_row, row) {
		var section = '';
		if (row.value['code_info']['components'][5] != null)
			section += row.value['code_info']['components'][5];
		if (row.value['code_info']['components'][6] != null)
			section += row.value['code_info']['components'][6];
		row.value['code_info']['course_section'] = section;

		return true;
	}

	exports.xml4_document(head, req, 'xml4_section.xml', section_predicate, section_concatenator);
}

// 4 Users
exports.xml4_user = function(head, req) {
	exports.xml4_document(head, req, 'xml4_user.xml', null, null);
}

// 5 Enrollments
exports.xml4_enrollment = function(head, req) {
	exports.xml4_document(head, req, 'xml4_enrollment.xml', null, null);
}

// exports.xml4membership = function(head, req) {
// 	exports.xml4document(head, req, 'membership.xml');
// }

exports.xml4_document = function(head, req, template, predicate, check_f) {
	var row = null;
	var previous_row = null;

	start({
		code: 200,
		headers: {
			'Content-Type': 'application/xml'
		}
	});

	send('<?xml version="1.0" encoding="UTF-8"?>\n');
	// send('<!DOCTYPE ENTERPRISE SYSTEM "ims_epv1p1.dtd">\n');
	send('<enterprise>\n');

	while (row = getRow()) {
		if ((predicate == null || predicate(row)) && (check_f == null || check_f(previous_row, row))) {
			send(templates.render(template, req, row));
			previous_row = row;
		}
	}

	send('</enterprise>\n');
}

// ------------------------------------------------------------
// CSV/text lists for general information usage
// ------------------------------------------------------------

// list all defined mappings in CSV file
exports.list_mappings = function(head, req) {
	exports.text_document(head, req, 'list_mappings.txt');
}

// generate CCB file for all course offerings
exports.list_ccb = function(head, req) {
	exports.text_document(head, req, 'ccb.txt');
}

// generate CCB file for all course offerings
exports.list_labs_and_tutorials = function(head, req) {
	exports.text_document(head, req, 'labs_and_tutorials.txt');
}

// generate text file of instructor emails
exports.instructor_mlist = function(head, req) {
	exports.text_document(head, req, 'instructor_list.txt');
}


exports.text_document = function(head, req, template) {
	var row = null;

	start({
		code: 200,
		headers: {
			'Content-Type': 'text/csv'
		}
	});

	while (row = getRow()) {
		send(templates.render(template, req, {
			doc: row.doc ? row.doc : row.value
		}));
	}
}


// ------------------------------------------------------------
// Tab-delimited lists for Atlas Systems Ares
// ------------------------------------------------------------

exports.ares_courses = function(head, req) {
	var date = new Date();
	var year = date.getFullYear();
	var semester = 'Unknown';
	switch (date.getMonth() + 1) {
		case 12:
			year += 1;
		case 1:
		case 2:
		case 3:
			semester = 'Winter';
			break;
		case 4:
		case 5:
			semester = 'Spring';
			break;
		case 6:
		case 7:
			semester = 'Summer';
			break;
		case 8:
		case 9:
		case 10:
		case 11:
			semester = 'Fall';
			break;

	}
	var assumed_semester = semester + ' ' + year;

	var row = getRow();
	while (row != null && row.key.length != 2) {
		row = getRow();
	}

	start({
		code: 200,
		headers: {
			'Content-Type': 'text/tab-separated-values'
		}
	});

	do {
		var ctx = {
			'course': row,
			'instructor': null,
			'semester': row.value.code_info.semester_name == 'Continuing Education' ? assumed_semester : row.value.code_info.semester_name
		};
		var instructors = [];

		do {
			var candidate = getRow();
			if (candidate == null || candidate.key.length == 2) {
				row = candidate;
				break;
			}

			instructors.push(candidate);
		} while (true);

		if (instructors.length > 0) {
			ctx['instructor'] = instructors[0];
		}

		send(templates.render('ares_course.txt', req, ctx));
	} while (row != null);
}

exports.ares_courseusers = function(head, req) {
	var courseusers_predicate = function(row) {
		return (row['value']['role']['status'] == '1');
	}

	exports.ares_feed(head, req, 'ares_courseuser.txt', courseusers_predicate);
}

exports.ares_users = function(head, req) {
	exports.ares_feed(head, req, 'ares_user.txt', null);
}

exports.ares_feed = function(head, req, template, predicate) {
	var row = null;

	start({
		code: 200,
		headers: {
			'Content-Type': 'text/tab-separated-values'
		}
	});

	while (row = getRow()) {
		if (predicate == null || predicate(row)) {
			send(templates.render(template, req, row));
		}
	}
}
