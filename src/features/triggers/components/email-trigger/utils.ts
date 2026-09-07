/**
 * Gmail-side forwarder: runs on a time trigger, posts every unread message in
 * the configured label to the Nodebase webhook and marks it as processed.
 * Lets a user wire up an email trigger without an inbound-email provider.
 */
export const generateGmailForwarderScript = (
  webhookUrl: string,
  label = "inbox",
) => `const WEBHOOK_URL = '${webhookUrl}';
const SEARCH_QUERY = 'in:${label} is:unread -label:nodebase-sent';

function forwardEmailsToNodebase() {
  const threads = GmailApp.search(SEARCH_QUERY, 0, 25);
  const processedLabel = getOrCreateLabel('nodebase-sent');

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      if (message.isUnread() === false) return;

      const payload = {
        messageId: message.getId(),
        from: message.getFrom(),
        to: message.getTo(),
        subject: message.getSubject(),
        text: message.getPlainBody(),
        html: message.getBody(),
        receivedAt: message.getDate().toISOString()
      };

      UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    });

    thread.addLabel(processedLabel);
    thread.markRead();
  });
}

function getOrCreateLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}`;
