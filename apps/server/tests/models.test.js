import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';

// Access the generated DMMF (Data Model Meta Format) to validate
// that all expected models, fields, and constraints exist.
const models = Prisma.dmmf.datamodel.models;

function getModel(name) {
  return models.find((m) => m.name === name) || null;
}

function modelHasField(model, fieldName) {
  if (!model) return false;
  return model.fields.some((f) => f.name === fieldName);
}

function getField(model, fieldName) {
  if (!model) return null;
  return model.fields.find((f) => f.name === fieldName) || null;
}

test('Prisma Schema Model Validation', async (t) => {
  await t.test('User model has all required fields', () => {
    const model = getModel('User');
    assert.ok(model, 'User model exists');
    assert.ok(modelHasField(model, 'email'), 'email field exists');
    assert.ok(modelHasField(model, 'passwordHash'), 'passwordHash field exists');
    assert.ok(modelHasField(model, 'name'), 'name field exists');
    assert.ok(modelHasField(model, 'role'), 'role field exists');
    assert.ok(modelHasField(model, 'lastLoginAt'), 'lastLoginAt field exists');
    assert.ok(modelHasField(model, 'createdAt'), 'createdAt field exists');

    const emailField = getField(model, 'email');
    assert.ok(emailField.isUnique, 'email field is unique');
  });

  await t.test('Bookmark model has compound unique index', () => {
    const model = getModel('Bookmark');
    assert.ok(model, 'Bookmark model exists');
    assert.ok(modelHasField(model, 'userId'), 'userId field exists');
    assert.ok(modelHasField(model, 'commandSlug'), 'commandSlug field exists');
    assert.ok(modelHasField(model, 'createdAt'), 'createdAt field exists');

    // Compound unique on [userId, commandSlug]
    const hasCompoundUnique = model.uniqueFields?.some(
      (fields) => fields.includes('userId') && fields.includes('commandSlug')
    );
    assert.ok(hasCompoundUnique, 'Compound unique index on {userId, commandSlug} exists');
  });

  await t.test('Note model has required fields', () => {
    const model = getModel('Note');
    assert.ok(model, 'Note model exists');
    assert.ok(modelHasField(model, 'userId'), 'userId field exists');
    assert.ok(modelHasField(model, 'commandSlug'), 'commandSlug field exists');
    assert.ok(modelHasField(model, 'content'), 'content field exists');
    assert.ok(modelHasField(model, 'updatedAt'), 'updatedAt field exists');
  });

  await t.test('Session model has required fields', () => {
    const model = getModel('Session');
    assert.ok(model, 'Session model exists');
    assert.ok(modelHasField(model, 'userId'), 'userId field exists');
    assert.ok(modelHasField(model, 'refreshTokenHash'), 'refreshTokenHash field exists');
    assert.ok(modelHasField(model, 'expiresAt'), 'expiresAt field exists');
    assert.ok(modelHasField(model, 'device'), 'device field exists');

    const tokenField = getField(model, 'refreshTokenHash');
    assert.ok(tokenField.isUnique, 'refreshTokenHash field is unique');
  });

  await t.test('LearningProgress model has required fields', () => {
    const model = getModel('LearningProgress');
    assert.ok(model, 'LearningProgress model exists');
    assert.ok(modelHasField(model, 'userId'), 'userId field exists');
    assert.ok(modelHasField(model, 'pathSlug'), 'pathSlug field exists');
    assert.ok(modelHasField(model, 'stepIndex'), 'stepIndex field exists');
    assert.ok(modelHasField(model, 'completedAt'), 'completedAt field exists');
  });

  await t.test('Contribution model has required fields and enum status', () => {
    const model = getModel('Contribution');
    assert.ok(model, 'Contribution model exists');
    assert.ok(modelHasField(model, 'submittedByUserId'), 'submittedByUserId field exists');
    assert.ok(modelHasField(model, 'prUrl'), 'prUrl field exists');
    assert.ok(modelHasField(model, 'status'), 'status field exists');
    assert.ok(modelHasField(model, 'reviewedByUserId'), 'reviewedByUserId field exists');
    assert.ok(modelHasField(model, 'reviewNotes'), 'reviewNotes field exists');
    assert.ok(modelHasField(model, 'targetCommandSlug'), 'targetCommandSlug field exists');
  });

  await t.test('ZeroResultQuery model has required fields', () => {
    const model = getModel('ZeroResultQuery');
    assert.ok(model, 'ZeroResultQuery model exists');
    assert.ok(modelHasField(model, 'queryText'), 'queryText field exists');
    assert.ok(modelHasField(model, 'count'), 'count field exists');
    assert.ok(modelHasField(model, 'lastQueriedAt'), 'lastQueriedAt field exists');

    const queryTextField = getField(model, 'queryText');
    assert.ok(queryTextField.isUnique, 'queryText field is unique');
  });
});
