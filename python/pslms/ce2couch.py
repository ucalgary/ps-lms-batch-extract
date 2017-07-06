#!/usr/bin/env python
# coding=utf-8

import os

import pymssql
from couchdb.client import Database
from couchdb.http import ResourceNotFound, ResourceConflict

from pslms.base import LMSObject


class CE2Couch(LMSObject):

    def argument_parser(self):
        parser = super(CE2Couch, self).argument_parser()

        parser.add_argument('--host', help='CE data mart host', default='iterdbprod33.uc.ucalgary.ca')
        parser.add_argument('--username', help='CE data mart username')
        parser.add_argument('--password', help='CE data mart password')
        parser.add_argument('--martdb', help='CE data mart db', default='UofC_CE_Mart')
        parser.add_argument('--db', help='CouchDB connection name')
        parser.add_argument('-batch', default='100', type=int, help='CouchDB bulk document batch size')

        return parser

    def main(self):
        queued_dates = []
        target_db = self.couchdb_client(self.args.db)
        query = """
            SELECT   Section_ID,
                     FORMAT(Section_Start_Date,'yyyy-MM-dd') as StartDate,
                     FORMAT(Section_End_Date,'yyyy-MM-dd') as EndDate,
                     replace(Course_Code, ' ', '_' ) + '_' + Section_Code as CourseCode
            FROM     dbo.D_CE_Section
            WHERE    (Section_Status = 'final_approval')
                     AND (Course_Status = 'final_approval')
                     AND (LMS_Enabled_YN = 'Y')
                     AND (Section_Start_Date IS NOT NULL)
                     AND (Section_End_Date>=getdate())
            """

        with pymssql.connect(self.args.host, self.args.username, self.args.password, self.args.martdb) as conn:
            with conn.cursor(as_dict=True) as cursor:
                cursor.execute(query)

                for row in cursor:
                    queued_dates.append(row)

                    if len(queued_dates) >= self.args.batch:
                        self.process_dates(queued_dates, target_db)
                        queued_dates = []

                if len(queued_dates) > 0:
                    self.process_dates(queued_dates, target_db)

    def process_dates(self, dates, target_db):
        doc_ids = [r.get('CourseCode') for r in dates]
        db_docs = [row.doc for row in target_db.view('_all_docs', keys=doc_ids, include_docs=True)]
        updates = []

        # For every pair of date information and db documents, set the end date
        # if it doesn't exist and place in updates for bulk update
        for date_info, db_doc in zip(dates, db_docs):
            if not db_doc:
                continue
            timeframe = db_doc.get('timeframe', {})
            if 'begin' not in timeframe or 'end' not in timeframe:
                timeframe['begin'] = {
                    '@restrict': '0',
                    '#text': date_info.get('StartDate')
                }
                timeframe['end'] = {
                    '@restrict': '0',
                    '#text': date_info.get('EndDate')
                }
                db_doc['timeframe'] = timeframe
                updates.append(db_doc)

        if len(updates) > 0:
            results = target_db.update(updates)


def main(args=None):
    CE2Couch(
        args=args
    ).run()


if __name__ == '__main__':
    main()
