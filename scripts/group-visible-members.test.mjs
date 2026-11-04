import test from 'node:test';
import assert from 'node:assert/strict';
import {groupVisibleMembers,sortMemberGroups} from '../lib/group-visible-members.ts';
const a={user_id:'one',membership_id:'a',class_name:'Aikido',registration_number:'JS-1'};
const b={user_id:'one',membership_id:'b',class_name:'Karate',registration_number:'JS-1'};
const c={user_id:'two',membership_id:'c',class_name:'Aikido',registration_number:null};
test('one member card preserves separate memberships and chooses filtered enrollment',()=>{
 const groups=groupVisibleMembers([a,b,c],[b]);assert.equal(groups.length,1);assert.deepEqual(groups[0].memberships,[a,b]);assert.equal(groups[0].preferredMembership,b);
});
test('grouping cannot add a filtered membership outside the authorized rows',()=>{
 assert.deepEqual(groupVisibleMembers([a],[b]),[]);assert.deepEqual(groupVisibleMembers([a],[a,b])[0].memberships,[a]);
});
test('stable identity keeps identical or missing display IDs separate and duplicate rows collapse',()=>{
 const other={...c,registration_number:'JS-1'};const groups=groupVisibleMembers([a,a,b,other],[a,b,other]);assert.equal(groups.length,2);assert.deepEqual(groups[0].memberships,[a,b]);assert.equal(groups[1].userId,'two');
});

const people = [
 {userId:'ten',preferredMembership:{full_name:'Amy',registration_number:'JS-0010'},memberships:['ten-a','ten-b']},
 {userId:'two',preferredMembership:{full_name:'Zara',registration_number:'JS2'},memberships:['two-a']},
 {userId:'blank',preferredMembership:{full_name:'Ben',registration_number:null},memberships:[]},
 {userId:'hundred',preferredMembership:{full_name:'amy',registration_number:'JS-0100'},memberships:[]},
];
const ids = rows => rows.map(row=>row.userId);
test('JS ID sort uses numeric identity despite prefix/padding and leaves unknown IDs last',()=>{
 assert.deepEqual(ids(sortMemberGroups(people,'id-asc')),['two','ten','hundred','blank']);
 assert.deepEqual(ids(sortMemberGroups(people,'id-desc')),['hundred','ten','two','blank']);
});
test('name sort is case-insensitive and stable by numeric ID for equal names',()=>{
 assert.deepEqual(ids(sortMemberGroups(people,'name-asc')),['ten','hundred','blank','two']);
 assert.deepEqual(ids(sortMemberGroups(people,'name-desc')),['two','blank','ten','hundred']);
});
test('sorting neither mutates input nor separates one member’s memberships',()=>{
 const before=structuredClone(people);const sorted=sortMemberGroups(people,'id-asc');
 assert.deepEqual(people,before);assert.notEqual(sorted,people);assert.equal(sorted[1],people[0]);assert.deepEqual(sorted[1].memberships,['ten-a','ten-b']);
});
