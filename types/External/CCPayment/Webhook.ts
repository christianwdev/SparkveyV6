export type CCPaymentWebhookPayload = {
  msg_id: string;
  msg_type: string;
  timestamp: string;
  data: unknown; // Specific payload depends on msg_type
};
