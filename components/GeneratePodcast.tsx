import React, { useState } from "react";

import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Loader } from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { v4 as uuidv4 } from "uuid";
import { useUploadFiles } from "@xixixao/uploadstuff/react";
import { useToast } from "@/components/ui/use-toast";
import VoiceRecorder from "./VoiceRecorder";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

interface GeneratePodcastProps {
  setAudioStorageId: (id: Id<"_storage">) => void;
  setAudio: (url: string) => void;
  audio: string;
  voicePrompt: string;
  setVoicePrompt: (prompt: string) => void;
  setAudioDuration: (duration: number) => void;
}

const useGeneratePodcast = ({
  setAudioStorageId,
  setAudio,
  voicePrompt,
}: Pick<
  GeneratePodcastProps,
  "setAudioStorageId" | "setAudio" | "voicePrompt"
>) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const { startUpload } = useUploadFiles(generateUploadUrl);
  const getAudioUrl = useMutation(api.podcasts.getUrl);
  const getPodcastAudio = useAction(api.openai.generateAudioAction);

  const generatePodcast = async () => {
    setIsGenerating(true);
    setAudio("");

    if (!voicePrompt || !selectedVoiceId) {
      toast({
        title: "Please provide both a voice type and prompt",
      });
      return setIsGenerating(false);
    }

    try {
      const response = await getPodcastAudio({
        voice: selectedVoiceId,
        input: voicePrompt,
      });

      const blob = new Blob([response], { type: "audio/mpeg" });
      const fileName = `podcast-${uuidv4()}.mp3`;
      const file = new File([blob], fileName, { type: "audio/mpeg" });
      const uploaded = await startUpload([file]);
      const storageId = (uploaded[0].response as any).storageId;

      setAudioStorageId(storageId);
      const audioUrl = await getAudioUrl({ storageId });
      setAudio(audioUrl!);
      setIsGenerating(false);

      toast({
        title: "Podcast Audio Generated successfully",
      });
    } catch (error) {
      toast({
        title: "Errr getting audio",
        variant: "destructive",
      });
      console.log("Error generating podcast audio", error);
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generatePodcast,
    selectedVoiceId,
    setSelectedVoiceId,
  };
};

const GeneratePodcast = (props: GeneratePodcastProps) => {
  const [voiceMethod, setVoiceMethod] = useState<"ai" | "record" | null>(null);
  const { isGenerating, generatePodcast, selectedVoiceId, setSelectedVoiceId } =
    useGeneratePodcast(props);

  const voiceCategory = [
    { name: "Adam", id: "pNInz6obpgDQGcFmaJgB" },
    { name: "Alice", id: "Xb7hH8MSUJpSbSDYk0k2" },
    { name: "Antoni", id: "ErXwobaYiN019PkySvjV" },
    { name: "Arnold", id: "VR6AewLTigWG4xSOukaG" },
    { name: "Bill", id: "pqHfZKP75CvOlQylNhV4" },
    { name: "Brian", id: "nPczCjzI2devNBz1zQrb" },
    { name: "Callum", id: "N2lVS1w4EtoT3dr4eOWO" },
    { name: "Charlie", id: "IKne3meq5aSn9XLyUdCD" },
    { name: "Charlotte", id: "XB0fDUnXU5powFXDhCwa" },
    { name: "Chris", id: "iP95p4xoKVk53GoZ742B" },
    { name: "Clyde", id: "2EiwWnXFnvU5JabPnv8n" },
    { name: "Daniel", id: "onwK4e9ZLuTAKqWW03F9" },
  ] as const;

  return (
    <div>
      <div className="flex flex-col gap-4">
        <Label className="text-16 font-bold text-white-1">
          Choose Voice Generation Method
        </Label>
        <div className="flex gap-4">
          <Button
            type="button"
            className={`flex-1 py-6 text-16 font-bold ${
              voiceMethod === "ai"
                ? "bg-orange-1 text-white-1"
                : "bg-black-1 text-gray-1 hover:bg-orange-1/10"
            }`}
            onClick={() => setVoiceMethod("ai")}
          >
            AI Text to Speech
          </Button>
          <Button
            type="button"
            className={`flex-1 py-6 text-16 font-bold ${
              voiceMethod === "record"
                ? "bg-orange-1 text-white-1"
                : "bg-black-1 text-gray-1 hover:bg-orange-1/10"
            }`}
            onClick={() => setVoiceMethod("record")}
          >
            Record Your Voice
          </Button>
        </div>
      </div>

      {voiceMethod === "ai" && (
        <div className="mt-8 flex flex-col gap-2.5">
          <Label className="text-16 font-bold text-white-1">
            Select AI Voice
          </Label>
          <Select onValueChange={setSelectedVoiceId} value={selectedVoiceId}>
            <SelectTrigger className="bg-black-1 text-gray-1">
              <SelectValue placeholder="Select a voice type" />
            </SelectTrigger>
            <SelectContent className="bg-black-1 text-gray-1">
              {voiceCategory.map((voice) => (
                <SelectItem
                  key={voice.id}
                  value={voice.id}
                  className="capitalize focus:bg-orange-1"
                >
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label className="text-16 font-bold text-white-1">
            AI Prompt to generate Podcast
          </Label>
          <Textarea
            className="input-class font-light focus-visible:ring-offset-orange-1"
            placeholder="Write what you want the AI to say..."
            rows={5}
            value={props.voicePrompt}
            onChange={(e) => props.setVoicePrompt(e.target.value)}
          />
          <Button
            type="submit"
            className="mt-4 bg-orange-1 py-4 text-16 font-extrabold text-white-1"
            onClick={generatePodcast}
          >
            {isGenerating ? (
              <>
                Generating
                <Loader size={20} className="ml-2 animate-spin" />
              </>
            ) : (
              "Generate AI Voice"
            )}
          </Button>
        </div>
      )}

      {voiceMethod === "record" && (
        <div className="mt-8">
          <Label className="text-16 font-bold text-white-1">
            Record Your Voice
          </Label>
          <div className="mt-4">
            <VoiceRecorder
              setAudioStorageId={props.setAudioStorageId}
              setAudio={props.setAudio}
              setAudioDuration={props.setAudioDuration}
            />
          </div>
        </div>
      )}

      {props.audio && (
        <div className="mt-8">
          <Label className="mb-2 block text-16 font-bold text-white-1">
            Preview Audio
          </Label>
          <audio
            controls
            className="w-full rounded-lg bg-black-1"
            onLoadedMetadata={(e) =>
              props.setAudioDuration(e.currentTarget.duration)
            }
            src={props.audio}
          />
        </div>
      )}
    </div>
  );
};

export default GeneratePodcast;
