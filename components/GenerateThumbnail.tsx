import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { Textarea } from "./ui/textarea";
import { GenerateThumbnailProps } from "@/types";
import { Loader } from "lucide-react";
import { Label } from "@radix-ui/react-label";
import { Input } from "./ui/input";
import Image from "next/image";
import { useToast } from "./ui/use-toast";
import { useAction, useMutation } from "convex/react";
import { useUploadFiles } from "@xixixao/uploadstuff/react";
import { api } from "@/convex/_generated/api";

const GenerateThumbnail = ({
  setImage,
  setImageStorageId,
  image,
  imagePrompt,
  setImagePrompt,
}: GenerateThumbnailProps) => {
  const [isAiThumbnail, setIsAiThumbnail] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const { toast } = useToast();

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const { startUpload } = useUploadFiles(generateUploadUrl);
  const getImageUrl = useMutation(api.podcasts.getUrl);
  const handleGenerateThumbnail = useAction(api.openai.generateThumbnailAction);

  const handleImage = async (blob: Blob, fileName: string) => {
    setIsImageLoading(true);
    setImage("");

    try {
      const file = new File([blob], fileName, { type: "image/png" });
      const uploaded = await startUpload([file]);
      const storageId = (uploaded[0].response as any).storageId;

      setImageStorageId(storageId);
      const imageUrl = await getImageUrl({ storageId });
      setImage(imageUrl!);

      toast({
        title: "Thumbnail Generated successfully",
        variant: "default",
      });
    } catch (error) {
      console.log(error);
      toast({
        title: "Error Uploading Image",
        variant: "destructive",
      });
    } finally {
      setIsImageLoading(false);
    }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      return toast({
        title: "Please provide a prompt for the thumbnail",
        variant: "destructive",
      });
    }

    setIsImageLoading(true);
    try {
      const response = await handleGenerateThumbnail({ prompt: imagePrompt });
      const blob = new Blob([response], { type: "image/png" });
      await handleImage(blob, `image-${uuidv4()}`);
    } catch (error) {
      console.log(error);
      toast({
        title: "Error generating thumbnail",
        variant: "destructive",
      });
      setIsImageLoading(false);
    }
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const files = e.target.files;
    if (!files?.length) return;

    try {
      const file = files[0];
      const blob = await file.arrayBuffer().then((ab) => new Blob([ab]));
      await handleImage(blob, file.name);
    } catch (error) {
      console.log("error uploading Image", error);
      toast({
        title: "Error Uploading Image",
        variant: "destructive",
      });
      setIsImageLoading(false);
    }
  };

  return (
    <>
      <div className="generate_thumbnail">
        <Button
          type="button"
          variant="plain"
          className={cn("transition-all duration-300", {
            "bg-orange-1 text-white-1": isAiThumbnail,
            "bg-black-1 text-gray-1": !isAiThumbnail,
          })}
          onClick={() => setIsAiThumbnail(true)}
        >
          Use AI to generate thumbnail
        </Button>

        <Button
          type="button"
          variant="plain"
          className={cn("transition-all duration-300", {
            "bg-orange-1 text-white-1": !isAiThumbnail,
            "bg-black-1 text-gray-1": isAiThumbnail,
          })}
          onClick={() => setIsAiThumbnail(false)}
        >
          Upload Custom thumbnail
        </Button>
      </div>

      {isAiThumbnail ? (
        <div className="flex flex-col gap-5">
          <div className="mt-5 flex flex-col gap-2.5">
            <Label className="text-16 font-bold text-white-1">
              AI Prompt to generate Thumbnail
            </Label>
            <Textarea
              className="input-class font-light focus-visible:ring-offset-orange-1"
              placeholder="Provide text to generate Thumbnail"
              rows={5}
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              disabled={isImageLoading}
            />
          </div>
          <div className="w-full max-w-[200px]">
            <Button
              type="button"
              className="w-full text-16 bg-orange-1 py-4 font-extrabold text-white-1 disabled:opacity-50"
              onClick={generateImage}
              disabled={isImageLoading || !imagePrompt.trim()}
            >
              {isImageLoading ? (
                <div className="flex items-center justify-center gap-2">
                  Generating
                  <Loader size={20} className="animate-spin" />
                </div>
              ) : (
                "Generate"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "image_div cursor-pointer transition-all duration-300",
            {
              "opacity-50": isImageLoading,
            }
          )}
          onClick={() => !isImageLoading && imageRef?.current?.click()}
        >
          <Input
            type="file"
            className="hidden"
            ref={imageRef}
            onChange={uploadImage}
            accept="image/png,image/jpeg,image/gif,image/svg+xml"
            disabled={isImageLoading}
          />

          {isImageLoading ? (
            <div className="text-16 flex items-center gap-2 font-medium text-white-1">
              Uploading
              <Loader size={20} className="animate-spin" />
            </div>
          ) : (
            <Image
              src="/icons/upload-image.svg"
              width={40}
              height={40}
              alt="upload"
            />
          )}

          <div className="flex flex-col gap-1 items-center">
            <h2 className="text-12 font-bold text-orange-1">Click to upload</h2>
            <p className="text-12 font-normal text-gray-1">
              SVG, PNG, JPG or GIF (max. 1000x1000px)
            </p>
          </div>
        </div>
      )}

      {image && (
        <div className="flex justify-center w-full">
          <div className="relative mt-5 rounded-lg overflow-hidden">
            <Image
              src={image}
              width={200}
              height={200}
              alt="thumbnail"
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
};

export default GenerateThumbnail;
