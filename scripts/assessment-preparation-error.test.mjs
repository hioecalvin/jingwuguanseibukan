import test from 'node:test';
import assert from 'node:assert/strict';
import {assessmentPreparationError} from '../lib/assessment-preparation-error.ts';

test('preparation errors give a safe actionable explanation', () => {
  for (const [message, expected] of [
    ['A new assessment cannot be prepared in the past', 'Keep the original assessment date'],
    ['Assessment roster is stale for membership private-id; reload candidates', 'Reload the roster'],
    ['Membership private-id is not eligible for this assessment', 'eligibility or target grade'],
    ['Select an active Member grading assessor', 'Select an active appointed grading assessor'],
    ['Only an active Super Admin can prepare assessments', 'Sign in with an active Super Admin'],
    ['Preparation key was already used for a different roster', 'Reload the roster'],
    ['Valid assessment date required', 'Enter a valid assessment date'],
  ]) assert.ok(assessmentPreparationError(message).includes(expected), message);
});

test('unknown errors never expose raw server content or discard selections', () => {
  const result = assessmentPreparationError('database detail private@example.invalid secret-token');
  assert.match(result, /Your selections are kept/);
  assert.doesNotMatch(result, /private|secret-token|database detail/);
});
