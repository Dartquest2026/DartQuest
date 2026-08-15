import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPasswordResetRedirectUrl,
  isPasswordRecoveryLocation,
  isValidEmail,
  normalizeEmail,
  PASSWORD_RESET_PATH,
  validateNewPassword,
} from '../src/features/auth/passwordRecovery.js'

test('normalizes and validates email addresses without account lookup', () => {
  assert.equal(normalizeEmail('  Test@Example.DE '), 'test@example.de')
  assert.equal(isValidEmail('test@example.de'), true)
  assert.equal(isValidEmail('not-an-email'), false)
})

test('builds the reset URL only from the supplied app origin', () => {
  assert.equal(
    getPasswordResetRedirectUrl('http://localhost:5173/somewhere'),
    `http://localhost:5173${PASSWORD_RESET_PATH}`,
  )
  assert.equal(
    getPasswordResetRedirectUrl('https://preview.example.test'),
    `https://preview.example.test${PASSWORD_RESET_PATH}`,
  )
})

test('validates the registration password rule and confirmation', () => {
  assert.match(validateNewPassword('12345', '12345'), /mindestens 6/)
  assert.match(validateNewPassword('123456', '654321'), /stimmen nicht überein/)
  assert.equal(validateNewPassword('123456', '123456'), '')
})

test('recognizes recovery links but rejects a direct route', () => {
  assert.equal(isPasswordRecoveryLocation({ pathname: PASSWORD_RESET_PATH, search: '?code=abc', hash: '' }), true)
  assert.equal(isPasswordRecoveryLocation({ pathname: PASSWORD_RESET_PATH, search: '', hash: '' }), false)
  assert.equal(isPasswordRecoveryLocation({ pathname: '/', search: '?code=abc', hash: '' }), false)
})
