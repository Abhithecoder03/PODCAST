import { NextResponse } from "next/server";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

const MAX_CHARS = 3000;

function splitTextIntoChunks(text: string): string[] {
  try {
    const chunks: string[] = [];
    let currentChunk = "";

    // Improved sentence splitting regex
    const sentences = text.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      // Skip empty sentences
      if (!sentence.trim()) continue;

      if ((currentChunk + sentence).length <= MAX_CHARS) {
        currentChunk += (currentChunk ? " " : "") + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());

    console.log(`Split text into ${chunks.length} chunks`);
    return chunks;
  } catch (error) {
    console.error("Error splitting text:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { text, voiceId } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: "Missing text or voiceId" },
        { status: 400 }
      );
    }

    console.log(
      `Received request with voiceId: ${voiceId}, text length: ${text.length}`
    );
    const chunks = splitTextIntoChunks(text);

    const polly = new PollyClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Process each chunk
    const audioBuffers: Uint8Array[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      const chunk = chunks[i];

      const command = new SynthesizeSpeechCommand({
        Text: chunk,
        OutputFormat: "mp3",
        VoiceId: voiceId,
        Engine: "neural",
      });

      try {
        const response = await polly.send(command);

        if (!response.AudioStream) {
          throw new Error(`No audio stream returned for chunk ${i + 1}`);
        }

        const audioData = await response.AudioStream.transformToByteArray();
        audioBuffers.push(audioData);
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        throw error;
      }
    }

    // If we have only one chunk, return it directly
    if (audioBuffers.length === 1) {
      return new NextResponse(audioBuffers[0], {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    }

    // Concatenate multiple chunks
    try {
      const finalAudioData = await concatenateAudioBuffers(audioBuffers);
      return new NextResponse(finalAudioData, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    } catch (error) {
      console.error("Error concatenating audio:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in TTS generation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate speech",
      },
      { status: 500 }
    );
  }
}

async function concatenateAudioBuffers(
  buffers: Uint8Array[]
): Promise<Uint8Array> {
  if (buffers.length === 0) {
    throw new Error("No audio buffers to concatenate");
  }

  if (buffers.length === 1) {
    return buffers[0];
  }

  try {
    // Simple concatenation for MP3 files
    const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }

    return result;
  } catch (error) {
    console.error("Error concatenating buffers:", error);
    throw error;
  }
}
