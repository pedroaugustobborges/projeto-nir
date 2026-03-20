/**
 * WhatsApp API Service
 *
 * This service integrates with the Colmeia API for sending WhatsApp messages.
 * Implements proper token generation and auto-refresh.
 */

// Colmeia API Configuration from environment variables
const COLMEIA_CONFIG = {
  baseUrl: "https://api.colmeia.me/v1/rest",
  socialNetworkId: import.meta.env.VITE_COLMEIA_SOCIAL_NETWORK_ID || "",
  tokenId: import.meta.env.VITE_COLMEIA_TOKEN_ID || "",
  email: import.meta.env.VITE_COLMEIA_EMAIL || "",
  password: import.meta.env.VITE_COLMEIA_PASSWORD || "",
  idCampaignAction: import.meta.env.VITE_COLMEIA_CAMPAIGN_ACTION_ID || "",
};

// Token cache
let cachedAuthToken: string | null = null;
let tokenExpiresAt: number | null = null;

interface SendIndividualParams {
  phone: string;
  templateId: string;
  parameters: Record<string, string>;
}

interface SendMessageResult {
  success: boolean;
  message: string;
}

interface ColmeiaTokenResponse {
  token: string;
  type?: string;
  status?: number;
}

/**
 * Hash password using SHA256 (uppercase hex)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex.toUpperCase();
}

/**
 * Generate authentication token from Colmeia API
 */
async function generateToken(): Promise<string> {
  console.log("[Colmeia] Generating new authentication token...");

  if (!COLMEIA_CONFIG.tokenId || !COLMEIA_CONFIG.email || !COLMEIA_CONFIG.password) {
    throw new Error(
      "Credenciais da Colmeia não configuradas. Verifique as variáveis de ambiente."
    );
  }

  const hashedPassword = await hashPassword(COLMEIA_CONFIG.password);

  const response = await fetch(`${COLMEIA_CONFIG.baseUrl}/generate-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      idSocialNetwork: COLMEIA_CONFIG.socialNetworkId,
    },
    body: JSON.stringify({
      idTokenToRefresh: COLMEIA_CONFIG.tokenId,
      email: COLMEIA_CONFIG.email,
      password: hashedPassword,
    }),
  });

  const responseText = await response.text();
  console.log("[Colmeia] Token generation response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(`Falha na autenticação: ${response.status} - ${responseText}`);
  }

  const data: ColmeiaTokenResponse = JSON.parse(responseText);

  if (!data.token) {
    throw new Error("Token não retornado pela API");
  }

  // Cache token for 55 minutes (token expires in 1 hour)
  cachedAuthToken = data.token;
  tokenExpiresAt = Date.now() + 55 * 60 * 1000;

  console.log("[Colmeia] Token generated successfully");
  return data.token;
}

/**
 * Get valid authentication token (generates new one if expired)
 */
async function getAuthToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedAuthToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedAuthToken;
  }

  // Generate new token
  return generateToken();
}

// Contact type for Colmeia API
interface ColmeiaContact {
  celular: string;
  [key: string]: string;
}

/**
 * Send campaign via Colmeia API
 */
async function sendCampaign(
  contacts: ColmeiaContact[]
): Promise<SendMessageResult> {
  console.log("[Colmeia] Sending campaign to", contacts.length, "contacts");
  console.log("[Colmeia] Contact list:", JSON.stringify(contacts, null, 2));

  try {
    const authToken = await getAuthToken();
    console.log("[Colmeia] Using token:", authToken.substring(0, 10) + "...");

    const response = await fetch(
      `${COLMEIA_CONFIG.baseUrl}/marketing-send-campaign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
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
      // If unauthorized, try to refresh token and retry once
      if (response.status === 401) {
        console.log("[Colmeia] Token expired, refreshing...");
        cachedAuthToken = null;
        tokenExpiresAt = null;

        const newToken = await getAuthToken();
        const retryResponse = await fetch(
          `${COLMEIA_CONFIG.baseUrl}/marketing-send-campaign`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: newToken,
              idSocialNetwork: COLMEIA_CONFIG.socialNetworkId,
            },
            body: JSON.stringify({
              idCampaignAction: COLMEIA_CONFIG.idCampaignAction,
              contactList: contacts,
            }),
          }
        );

        const retryText = await retryResponse.text();
        console.log("[Colmeia] Retry response:", retryResponse.status, retryText);

        if (!retryResponse.ok) {
          return {
            success: false,
            message: `Erro da API Colmeia: ${retryResponse.status} - ${retryText}`,
          };
        }

        return {
          success: true,
          message: "Mensagem enviada com sucesso via WhatsApp",
        };
      }

      return {
        success: false,
        message: `Erro da API Colmeia: ${response.status} - ${responseText}`,
      };
    }

    return {
      success: true,
      message: "Mensagem enviada com sucesso via WhatsApp",
    };
  } catch (error) {
    console.error("[Colmeia] Error in sendCampaign:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao enviar campanha",
    };
  }
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
          message: "Número de telefone inválido",
        };
      }

      // Build contact object with parameters
      const contact: ColmeiaContact = {
        celular: cleanPhone,
        ...parameters,
      };

      console.log(
        "[Colmeia] Sending message to:",
        cleanPhone,
        "with params:",
        contact
      );

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

        const colmeiaContact: ColmeiaContact = {
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

  /**
   * Force token refresh (useful for debugging)
   */
  async refreshToken(): Promise<void> {
    cachedAuthToken = null;
    tokenExpiresAt = null;
    await getAuthToken();
  },
};
