import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

async function makeNWSRequest<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from NWS API: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);

    return null;
  }
}

// Register weather tools
server.tool(
  "get-alerts",
  "Get weather alerts for a state",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const url = `${NWS_API_BASE}/alerts/active?area=${stateCode}`;
    const data: AlertsResponse | null = await makeNWSRequest<AlertsResponse>(
      url
    );
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch alerts for ${stateCode}. Please try another state.`,
          },
        ],
      };
    }

    const features = data.features || [];

    if (features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No alerts found for ${stateCode}.`,
          },
        ],
      };
    }

    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join(
      "\n"
    )}`;
    return {
      content: [
        {
          type: "text",
          text: alertsText,
        },
      ],
    };
  }
);

export default server;
