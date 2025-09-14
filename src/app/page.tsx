"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sun } from "lucide-react";
import WaitingScreen from "@/components/chat/waiting-screen";
import VideoPlayer from "@/components/chat/video-player";
import ChatControls from "@/components/chat/chat-controls";
import ChatPanel from "@/components/chat/chat-panel";
import { useToast } from "@/hooks/use-toast";

type ChatStatus = "idle" | "waiting" | "connected";

export default function Home() {
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [controls, setControls] = useState({
    mic: true,
    video: true,
    sound: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (status === "waiting") {
      const timer = setTimeout(() => {
        setStatus("connected");
      }, 3000); // Simulate finding a user
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleStartChat = async () => {
    setStatus("waiting");
    // In a real app, you would get user media here:
    // try {
    //   const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    //   setLocalStream(stream);
    //   setStatus('waiting');
    // } catch (err) {
    //   console.error("Error accessing media devices.", err);
    //   toast({
    //     variant: "destructive",
    //     title: "Camera/Mic Error",
    //     description: "Could not access your camera and microphone. Please check permissions.",
    //   });
    //   setStatus('idle');
    // }
  };

  const handleEndCall = () => {
    setStatus("idle");
    // In a real app, you would clean up streams and connections here.
  };

  const handleReport = () => {
    toast({
      title: "Report Sent",
      description: "Thank you for your feedback. We will review the report.",
    });
  };

  const toggleControl = (control: keyof typeof controls) => {
    setControls((prev) => ({ ...prev, [control]: !prev[control] }));
  };

  const renderContent = () => {
    switch (status) {
      case "waiting":
        return <WaitingScreen onCancel={() => setStatus("idle")} />;
      case "connected":
        return (
          <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl mx-auto">
            <div className="flex flex-col gap-4 flex-grow">
              <div className="aspect-video">
                <VideoPlayer isLocal={false} isVideoOn={true} />
              </div>
              <div className="aspect-video">
                <VideoPlayer isLocal={true} isVideoOn={controls.video} isMuted={!controls.mic} />
              </div>
            </div>
            <div className="w-full lg:w-96 flex flex-col gap-4">
              <ChatPanel />
              <ChatControls
                onMuteToggle={() => toggleControl("mic")}
                onVideoToggle={() => toggleControl("video")}
                onSoundToggle={() => toggleControl("sound")}
                onEndCall={handleEndCall}
                onReport={handleReport}
                isMicOn={controls.mic}
                isVideoOn={controls.video}
                isSoundOn={controls.sound}
              />
            </div>
          </div>
        );
      case "idle":
      default:
        return (
          <Card className="w-full max-w-md text-center shadow-xl bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <Sun className="mx-auto h-16 w-16 text-primary mb-4" />
              <h1 className="text-3xl font-bold font-headline mb-2 text-foreground">
                Welcome to olsme.tv
              </h1>
              <p className="text-muted-foreground mb-6">
                 Connect and practice Mindful Video Chat.
              </p>
              <Button size="lg" onClick={handleStartChat} className="w-full">
                Start a Mindful Chat
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center flex-grow">
      {renderContent()}
    </div>
  );
}
