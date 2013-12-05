exports.from_ps = function(doc, req) {	
	// If there is not an existing doc, create one.
	if (!doc) {
		return [JSON.parse(req.body), 'Created.'];
	}

	// If there is an existing doc, update it if the
	// POST body is different than what's in the database
	var req_doc = JSON.parse(req.body);
	var lmsutils = require('views/lib/lmsutils');

	if (!lmsutils.ps_docs_equal(doc, req_doc)) {
		req_doc['_rev'] = doc['_rev'];
		if ('mapping' in doc) {
			req_doc['mapping'] = doc['mapping'];
		}

		return [req_doc, 'Updated.'];
	} else {
		return [null, 'No changes.'];
	}
}