/**
 * WhatsApp API Service
 *
 * This service integrates with the Colmeia API for sending WhatsApp messages.
 */

// Colmeia API Configuration
const COLMEIA_CONFIG = {
  baseUrl: "https://api.colmeia.me/v1/rest",
  socialNetworkId: "oFzvyMeL6e8ALfPc4DPQICNTwWhuU9", // HECAD
  authToken: "WPUgUAzy8wH7DmYGQEgBys6JDEfEDcd5", // Dashboard token (used directly)
  idCampaignAction: "DGQDLxrnXeOblrzzCLeLrnld4juX8h",
};

interface SendIndividualParams {
  phone: string;
  templateId: string;
  parameters: Record<string, string>;
}

interface SendMessageResult {
  success: boolean;
  message: string;
}

/**
 * Send campaign via Colmeia API
 */
async function sendCampaign(
  contacts: Array<{
    celular: string;
    [key: string]: string;
  }>
): Promise<SendMessageResult> {
  console.log("[Colmeia] Sending campaign to", contacts.length, "contacts");
  console.log("[Colmeia] Using token:", COLMEIA_CONFIG.authToken);
  console.log("[Colmeia] Contact list:", JSON.stringify(contacts, null, 2));

  const response = await fetch(
    `${COLMEIA_CONFIG.baseUrl}/marketing-send-campaign`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: COLMEIA_CONFIG.authToken,
        idSocialNetwork: COLMEIA_CONFIG.socialNetworkId,
      },
      body: JSON.stringify({
        idCampaignAction: COLMEIA_CONFIG.idCampaignAction,
        contactList: contacts,
      }),
    }
  );

  const responseText = await response.text();
  console.log("[Colmeia] Response:", response.status, responseText);

  if (!response.ok) {
    return {
      success: false,
      message: `Erro da API Colmeia: ${response.status} - ${responseText}`,
    };
  }

  return {
    success: true,
    message: "Mensagem enviada com sucesso via WhatsApp",
  };
}

export const whatsappService = {
  /**
   * Send individual WhatsApp message
   */
  async sendIndividual(
    params: SendIndividualParams
  ): Promise<SendMessageResult> {
    try {
      const { phone, parameters } = params;

      // Validate phone number
      let cleanPhone = phone.replace(/\D/g, "");

      // Add country code if not present
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = "55" + cleanPhone;
      }

      if (cleanPhone.length < 12 || cleanPhone.length > 13) {
        return {
          success: false,
          message: "Numero de telefone invalido",
        };
      }

      // Build contact object with parameters
      // Parameters are passed with their actual field names (e.g., "nome", "especialidade")
      const contact: Record<string, string> = {
        celular: cleanPhone,
        ...parameters,
      };

      console.log(
        "[Colmeia] Sending message to:",
        cleanPhone,
        "with params:",
        contact
      );

      // Send campaign directly using dashboard token
      const result = await sendCampaign([contact]);

      return result;
    } catch (error) {
      console.error("[Colmeia] Error sending message:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao enviar mensagem",
      };
    }
  },

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulk(
    contacts: Array<{
      phone: string;
      [key: string]: string | undefined;
    }>
  ): Promise<SendMessageResult> {
    try {
      // Transform contacts to Colmeia format
      const colmeiaContacts = contacts.map((contact) => {
        let cleanPhone = contact.phone.replace(/\D/g, "");

        // Add country code if not present
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
          cleanPhone = "55" + cleanPhone;
        }

        const colmeiaContact: Record<string, string> = {
          celular: cleanPhone,
        };

        // Copy all other parameters (excluding phone)
        Object.keys(contact).forEach((key) => {
          if (key !== "phone" && contact[key]) {
            colmeiaContact[key] = contact[key] as string;
          }
        });

        return colmeiaContact;
      });

      console.log(
        "[Colmeia] Sending bulk messages to",
        colmeiaContacts.length,
        "contacts"
      );

      // Send campaign directly using dashboard token
      const result = await sendCampaign(colmeiaContacts);

      if (result.success) {
        result.message = `${contacts.length} mensagens enviadas com sucesso`;
      }

      return result;
    } catch (error) {
      console.error("[Colmeia] Error sending bulk messages:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao enviar mensagens",
      };
    }
  },

  /**
   * Format phone number to Brazilian format
   */
  formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, "");

    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    } else if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }

    return phone;
  },

  /**
   * Validate phone number
   */
  isValidPhone(phone: string): boolean {
    const clean = phone.replace(/\D/g, "");
    return clean.length >= 10 && clean.length <= 13;
  },
};
