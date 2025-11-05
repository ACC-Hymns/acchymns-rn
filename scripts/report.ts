import { useEffect, useRef, useState } from "react";
import { DynamoDBClient, PutItemCommand, type PutItemCommandInput } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import type { SongReference } from "@/constants/types";

export function useReportAPI() {
  const client = useRef<DynamoDBClient | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupClient = async () => {
      try {
        console.log("Initializing DynamoDB client...");
        const newClient = new DynamoDBClient({
          region: "us-east-2",
          credentials: fromCognitoIdentityPool({
            identityPoolId: "us-east-2:b4399f56-af48-4544-b368-31e6701d544c",
            clientConfig: { region: "us-east-2" },
          }),
        });
        client.current = newClient;

        // Force credentials to resolve
        await newClient.config.credentials();

        setIsReady(true);
        console.log("DynamoDB client ready");
      } catch (err) {
        console.error("Failed to initialize client:", err);
      }
    };

    setupClient();
  }, []);

  async function report(song: SongReference) {
    console.log("Reporting issue for", song);
    if (!client.current) {
      console.warn("DynamoDB client not ready");
      return null;
    }

    const data: PutItemCommandInput = {
      TableName: "ACC_HYMNS_SONG_ISSUES",
      Item: {
        SONG_BOOK: { S: song.book },
        SONG_NUMBER: { S: song.number },
      },
    };

    try {
      const command = new PutItemCommand(data);
      const response = await client.current.send(command);
      console.log("Report sent successfully", response);
      return response;
    } catch (err) {
      console.error("Failed to send report:", err);
      return null;
    }
  }

  return { isReady, report };
}