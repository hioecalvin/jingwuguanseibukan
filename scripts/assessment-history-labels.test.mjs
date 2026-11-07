import test from 'node:test';
import assert from 'node:assert/strict';
import {assessmentNumberLabel,assessmentOutcomeLabel} from '../lib/assessment-history-labels.ts';
test('historical markers and unknown evidence are never labelled Fail',()=>{
 for(const [value,label] of Object.entries({pass:'Pass',fail:'Fail',recorded_grade:'Historical grade',lost_record:'Record lost',skipped_rank:'Rank skipped',other:'Unknown'}))assert.equal(assessmentOutcomeLabel(value),label);
});

test('missing assessment numbers explain the available record evidence',()=>{
 const base={assessment_number:null,member_id:'JS-0001',outcome:'recorded_grade',assessment_date:'2020-02-03'};
 assert.equal(assessmentNumberLabel({...base,assessment_number:'2020-0012'}),'2020-0012');
 assert.equal(assessmentNumberLabel({...base,member_id:null}),'Not numbered — member not matched');
 assert.equal(assessmentNumberLabel({...base,outcome:'lost_record',assessment_date:null}),'Not numbered — record lost');
 assert.equal(assessmentNumberLabel({...base,outcome:'skipped_rank',assessment_date:null}),'Not numbered — rank skipped');
 assert.equal(assessmentNumberLabel({...base,assessment_date:null}),'Not numbered — date incomplete');
 assert.equal(assessmentNumberLabel(base),'Not numbered — needs review');
 assert.equal(assessmentNumberLabel({...base,assessment_number:'2020-0012',member_id:null,assessment_date:null}),'2020-0012');
});
