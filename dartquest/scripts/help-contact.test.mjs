import assert from 'node:assert/strict'
import test from 'node:test'
import { HELP_FAQS } from '../src/features/help/helpData.js'
import { createMailtoUrl, createSupportMessage, getPlatformSummary, isValidOptionalEmail } from '../src/features/help/supportContact.js'

test('FAQ data covers the required help topics and has unique ids', () => {
  assert.equal(HELP_FAQS.length, 5)
  assert.equal(new Set(HELP_FAQS.map((item) => item.id)).size, HELP_FAQS.length)
  assert.ok(HELP_FAQS.every((item) => item.question && item.answer))
})

test('optional reply email is validated locally', () => {
  assert.equal(isValidOptionalEmail(''), true)
  assert.equal(isValidOptionalEmail('tester@example.de'), true)
  assert.equal(isValidOptionalEmail('keine-email'), false)
})

test('support message contains version and only coarse platform data', () => {
  const platform = getPlatformSummary({ userAgent: 'Mozilla/5.0 Chrome/123.0', platform: 'Android' })
  const body = createSupportMessage({ topic: 'Technischer Fehler', message: 'Die Ansicht lädt nicht.', replyEmail: '', appVersion: '0.0.0', platform })
  assert.match(body, /DartQuest-Version: 0\.0\.0/)
  assert.match(body, /Chrome · Android/)
  assert.doesNotMatch(body, /access_token|refresh_token|Supabase-Session|Passwort:/i)
})

test('mailto encodes recipient, subject and message', () => {
  const url = createMailtoUrl('support@example.de', 'Hilfe & Kontakt', 'Zeile 1\nZeile 2')
  assert.equal(url, 'mailto:support%40example.de?subject=Hilfe%20%26%20Kontakt&body=Zeile%201%0AZeile%202')
  assert.equal(createMailtoUrl('', 'Hilfe', 'Text'), null)
})
