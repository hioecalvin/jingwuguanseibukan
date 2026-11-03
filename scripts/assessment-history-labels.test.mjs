import test from 'node:test';
import assert from 'node:assert/strict';
import {assessmentOutcomeLabel} from '../lib/assessment-history-labels.ts';
test('historical markers and unknown evidence are never labelled Fail',()=>{
 for(const [value,label] of Object.entries({pass:'Pass',fail:'Fail',recorded_grade:'Historical grade',lost_record:'Record lost',skipped_rank:'Rank skipped',other:'Unknown'}))assert.equal(assessmentOutcomeLabel(value),label);
});
