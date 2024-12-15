import { action } from "./_generated/server";
import { v } from "convex/values";
import axios from "axios";

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY||"sk_685a17d7ee9336a1089812c495b448033e15ef0cfaa7973c";
const token="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"

export const generateAudioAction = action({
  args: { input: v.string(), voice: v.string() },
    handler: async (_, { voice, input }) => {
    console.log(voice,ELEVEN_LABS_API_KEY)
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
    const headers = {
      "Content-Type": "application/json",
      "xi-api-key": ELEVEN_LABS_API_KEY,
    };
    const data = {
      text: input,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5, // Adjust as needed
        similarity_boost: 0.5, // Adjust as needed
        speed: 0.85, // Add the speed parameter if supported
      },
    };
  
   try {
    const response = await axios.post(url, data, {
      headers,
      responseType: 'arraybuffer',
    });

    if (response.status === 200 && response.data.byteLength > 0) {
      console.log('Audio generated successfully');
      return response.data;
    } else {
      console.error('No audio data received');
      throw new Error('No audio data received');
    }
  } catch (error) {
    console.error('Error generating audio:',  error);
    throw new Error('Failed to generate audio');
  }
},
});

export const generateThumbnailAction = action({
  args: {
    prompt: v.string()
  },
  handler: async (_, { prompt }) => {
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
        {
          headers: {
            Authorization: "Bearer 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",
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({"inputs":prompt}),
        }
      );
      
      const blob = await response.blob();
      
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      return arrayBuffer; // Returning ArrayBuffer instead of Buffer
    } catch (error) {
      console.error("Error generating thumbnail", error);
      throw new Error("Error generating thumbnail");
    }
  }
});




// import requests

// API_URL = "https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4"
// headers = {"Authorization": "Bearer hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}

// def query(payload):
// 	response = requests.post(API_URL, headers=headers, json=payload)
// 	return response.content
// image_bytes = query({
// 	"inputs": "Astronaut riding a horse",
// })
// # You can access the image with PIL.Image for example
// import io
// from PIL import Image
// image = Image.open(io.BytesIO(image_bytes))