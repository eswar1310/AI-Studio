
import React, { useState, useEffect, useRef } from "react";
import { chatWithAssistant } from "../api";
import { useStudio } from "./studio/StudioContext";

export default function ChatAssistant() {
    const { tracks, bpm, duration, selectedTrackId, assets, currentTime } = useStudio();

    const [isOpen, setIsOpen] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
        { role: "assistant", text: "Beep boop! I'm ROOBO. How can I help you make some music today?" },
    ]);
    const [input, setInput] = useState("");
    const [showEndOptions, setShowEndOptions] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Status & Poses
    const [status, setStatus] = useState<"idle" | "walking" | "speaking" | "sleeping" | "spinning" | "thinking" | "love">("idle");
    const [lastActive, setLastActive] = useState(Date.now());
    const [hasWandered, setHasWandered] = useState(false);

    const [position, setPosition] = useState({ x: window.innerWidth - 120, y: window.innerHeight - 150 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Speech Recognition Setup
    const recognitionRef = useRef<any>(null);
    const handleSendRef = useRef<(text: string) => void>(() => { });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Sleeping Logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isOpen && !isSpeaking && !isListening && !isDragging) {
                const idleTime = Date.now() - lastActive;
                if (idleTime > 60000) {
                    if (status !== "sleeping") setStatus("sleeping");
                } else if (idleTime > 40000) {
                    // Wander around the window edges before sleep
                    setStatus("walking");

                    const margin = 120;
                    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
                    let tx = position.x;
                    let ty = position.y;

                    if (side === 0) { // Top edge
                        tx = margin + Math.random() * (window.innerWidth - 2 * margin);
                        ty = margin;
                    } else if (side === 1) { // Right edge
                        tx = window.innerWidth - margin;
                        ty = margin + Math.random() * (window.innerHeight - 2 * margin);
                    } else if (side === 2) { // Bottom edge
                        tx = margin + Math.random() * (window.innerWidth - 2 * margin);
                        ty = window.innerHeight - margin;
                    } else { // Left edge
                        tx = margin;
                        ty = margin + Math.random() * (window.innerHeight - 2 * margin);
                    }

                    setPosition({ x: tx, y: ty });

                    setTimeout(() => {
                        setStatus(prev => prev === "walking" ? "idle" : prev);
                    }, 2000); // Give it enough time to move
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isOpen, isSpeaking, isListening, lastActive, status, isDragging, position]);

    // Wake up on interaction
    useEffect(() => {
        if (isOpen || isSpeaking || isListening || input.length > 0) {
            setLastActive(Date.now());
            setHasWandered(false);
            if (status === "sleeping") setStatus("idle");
        }
    }, [isOpen, isSpeaking, isListening, input]);

    // Global toggle event
    useEffect(() => {
        const handleToggle = () => {
            setIsHidden(false); // Unhide if it was hidden
            setIsOpen(prev => !prev);
        };
        window.addEventListener("toggle-chat", handleToggle);
        return () => window.removeEventListener("toggle-chat", handleToggle);
    }, []);

    const speak = (text: string) => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const roboVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Male") || v.name.includes("Zira"));
            if (roboVoice) utterance.voice = roboVoice;

            utterance.pitch = 1.4; // Make it cute/high
            utterance.rate = 1.2;

            utterance.onstart = () => {
                setIsSpeaking(true);
                // Emotion-based status is set in handleSend, we don't want to override it here immediately
            };
            utterance.onend = () => {
                setIsSpeaking(false);
                setStatus("idle");
            };

            window.speechSynthesis.speak(utterance);
        }
    };

    const toggleListen = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setIsListening(true);
            recognitionRef.current?.start();
        }
    };


    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.chat-window')) return;
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        setLastActive(Date.now());
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Bounds checking
                const newX = Math.min(Math.max(20, e.clientX - dragOffset.current.x), window.innerWidth - 100);
                const newY = Math.min(Math.max(20, e.clientY - dragOffset.current.y), window.innerHeight - 100);
                setPosition({ x: newX, y: newY });
            }
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;
        setLastActive(Date.now());
        const newMsg = { role: "user" as const, text };
        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setStatus("thinking");
        setShowEndOptions(false);

        // Helper Knowledge Base for Roobo
        const shortcuts = `
            Keyboard Shortcuts for Vinu Music Studio:
            - Navigation: 1 (Create), 2 (Studio), 3 (Isolator), 4 (History), 5 (Settings)
            - General: / (Toggle Chat), Alt+G (Generate Music)
            - Studio Panels: [ (Toggle Assets), ] (Toggle Video)
            - Studio File: Ctrl+L (Load Video), Ctrl+E (Export WAV), Ctrl+Shift+E (Export MP4)
            - Studio Edit: Space (Play/Pause), T (Split Clip), Delete (Delete Selection), Ctrl+Z (Undo), Ctrl+Y (Redo)
            - Zooming: + / - (Zoom Timeline), Ctrl + Mouse Wheel
        `;

        const promptWithContext = text.toLowerCase().includes("shortcut") || text.toLowerCase().includes("keyboard")
            ? `${text}\n\n[CONTEXT: Here are the shortcuts you should know if asked: ${shortcuts}]`
            : text;

        // Build Project Context
        const projectContext = {
            bpm,
            duration,
            currentTime: Math.round(currentTime * 100) / 100,
            selectedTrackId,
            tracks: tracks.map(t => ({
                id: t.id,
                name: t.name,
                type: t.type,
                clipsCount: t.clips.length,
                isMuted: t.muted,
                isSolo: t.solo,
                volume: Math.round(t.volume * 100) + "%",
                pan: t.pan
            })),
            assets: assets.map(a => ({ name: a.name, kind: a.kind, id: a.id }))
        };

        try {
            // Pass history along with the message AND project context
            const res = await chatWithAssistant(promptWithContext, messages, projectContext);
            const reply = res.reply || "Beep boop? (Something went wrong)";

            const action = res.action;
            const emotion = res.emotion;

            setMessages(prev => [...prev, { role: "assistant", text: reply }]);

            // Trigger Emotion
            if (emotion === "excited" || emotion === "love") {
                setStatus("spinning");
                setTimeout(() => setStatus("speaking"), 1000);
            } else if (emotion === "love") {
                setStatus("love");
            } else {
                setStatus("speaking");
            }

            speak(reply);

            if (action && action !== "none") {
                handleAction(action);
            }

            // Show end/continue options after a delay
            setTimeout(() => {
                setShowEndOptions(true);
            }, 1000);

        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", text: "My circuits are jammed... try again?" }]);
            setStatus("idle");
        }
    };

    // Keep ref updated for speech recognition callback
    useEffect(() => {
        handleSendRef.current = handleSend;
    }, [handleSend]);

    // Initialize Speech Recognition (Moved down to access handleSend via ref)
    useEffect(() => {
        if ("webkitSpeechRecognition" in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = "en-US";

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                // Use ref to access latest handleSend
                handleSendRef.current(transcript);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const handleAction = (action: string) => {
        let selector = "";
        switch (action) {
            case "move_to_timeline": selector = "#timeline-area"; break;
            case "move_to_assets": selector = "#asset-panel"; break;
            case "move_to_generate": selector = "#asset-panel"; break;
            case "move_to_projects": selector = ".top-nav-projects"; break;
        }

        if (selector) {
            const el = document.querySelector(selector);
            if (el) {
                setStatus("walking");
                const rect = el.getBoundingClientRect();
                const targetX = Math.min(Math.max(40, rect.left + rect.width / 2 - 40), window.innerWidth - 100);
                const targetY = Math.min(Math.max(40, rect.top + 40), window.innerHeight - 100);

                setPosition({ x: targetX, y: targetY });
                setTimeout(() => setStatus("idle"), 1200);
            }
        }
    };

    const handleEndChat = () => {
        setMessages([
            { role: "assistant", text: "Beep boop! I'm ROOBO. How can I help you make some music today?" },
        ]);
        setShowEndOptions(false);
        setIsOpen(false);
        setStatus("idle");
    };

    const handleContinueChat = () => {
        setShowEndOptions(false);
    };

    const renderRobot = () => {
        const isWalking = status === "walking";
        const isSleeping = status === "sleeping";
        const isSpeaking = status === "speaking";
        const isThinking = status === "thinking";
        const isSpinning = status === "spinning";
        const isLove = status === "love";

        return (
            <div className={`relative w-24 h-24 flex flex-col items-center justify-center transition-all duration-500 scale-75 ${isWalking ? "-rotate-12 translate-x-1" :
                isSleeping ? "opacity-60 grayscale-[0.5]" :
                    isSpinning ? "animate-spin-robot" : ""
                }`}>
                {/* Robot Head */}
                <div className={`relative w-14 h-10 bg-white rounded-xl border-2 border-blue-400/30 shadow-lg z-20 transition-all ${isSpeaking ? "animate-bounce" :
                    isThinking ? "rotate-[15deg] translate-y-[-2px]" :
                        "animate-float-small"
                    }`}>
                    {/* Screen Interface */}
                    <div className="absolute inset-1 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                        {/* Eyes */}
                        <div className="flex gap-2">
                            {isSleeping ? (
                                <>
                                    <div className="w-2.5 h-0.5 bg-blue-400/50 rounded-full" />
                                    <div className="w-2.5 h-0.5 bg-blue-400/50 rounded-full" />
                                </>
                            ) : isThinking ? (
                                <>
                                    <div className="w-1 h-3 bg-blue-300 rounded-full animate-pulse" />
                                    <div className="w-1 h-1 bg-blue-300 rounded-full mt-2" />
                                </>
                            ) : isLove ? (
                                <div className="text-red-400 text-xs animate-ping">♥</div>
                            ) : (
                                <>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-blink" />
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-blink" />
                                </>
                            )}
                        </div>
                    </div>
                    {/* Antennas */}
                    <div className="absolute -top-1.5 left-2 w-0.5 h-3 bg-blue-400/50 rounded-full origin-bottom rotate-[-15deg]" />
                    <div className="absolute -top-1.5 right-2 w-0.5 h-3 bg-blue-400/50 rounded-full origin-bottom rotate-[15deg]" />
                </div>

                {/* Robot Body */}
                <div className="relative w-12 h-12 bg-white rounded-b-2xl -mt-1 border-2 border-blue-400/20 shadow-md z-10 flex flex-col items-center pt-3">
                    {/* Chest Core */}
                    <div className={`w-4 h-4 rounded-full border ${isSleeping ? "bg-gray-700" : "bg-blue-400/20 shadow-[0_0_8px_rgba(96,165,250,0.5)]"} flex items-center justify-center`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isSleeping ? "bg-gray-500" : "bg-blue-500 shadow-inner"}`} />
                    </div>
                    {/* Small Arms */}
                    <div className={`absolute -left-1 top-3 w-2 h-6 bg-gray-100 rounded-full origin-top transition-transform ${isWalking ? "rotate-[-30deg]" : "rotate-6"}`} />
                    <div className={`absolute -right-1 top-3 w-2 h-6 bg-gray-100 rounded-full origin-top transition-transform ${isWalking ? "rotate-[30deg]" : "-rotate-6"}`} />
                </div>

                {/* Hover Base */}
                <div className={`mt-1 flex flex-col items-center transition-all ${isSleeping ? "opacity-0" : "opacity-100"}`}>
                    <div className={`w-6 h-1.5 bg-blue-400/30 rounded-full blur-[2px] ${isWalking ? "scale-x-150 animate-pulse" : "scale-x-100"}`} />
                    <div className={`w-3 h-4 bg-gradient-to-t from-transparent to-blue-400/20 rounded-full -mt-0.5 origin-top ${isWalking ? "scale-y-125" : "scale-y-100"}`} />
                </div>
            </div>
        );
    };


    if (isHidden) return null;

    return (
        <div
            className={`fixed z-50 flex flex-col items-center ${status === 'walking' ? 'transition-all duration-1000 ease-in-out' : 'transition-none'}`}
            style={{
                left: position.x,
                top: position.y,
                touchAction: "none",
                pointerEvents: isDragging ? 'none' : 'auto',
                transform: 'translate(-50%, -85%)' // Anchor parent to robot's base/center
            }}
        >
            {/* Proper Aligned Chat Window */}
            {isOpen && (
                <div
                    className={`chat-window mb-4 w-80 h-[450px] bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-fade-in-up origin-bottom relative ${isSpeaking ? 'ring-2 ring-blue-500/20' : ''}`}
                    style={{ pointerEvents: 'auto' }}
                >
                    {/* Header */}
                    <div className="bg-white/5 p-4 flex justify-between items-center border-b border-white/5 cursor-move" onMouseDown={handleMouseDown}>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-400' : 'bg-blue-500'} animate-pulse shadow-[0_0_10px_#3b82f6]`} />
                            <span className="text-white font-bold text-xs tracking-widest uppercase opacity-80">ROOBO V2.5</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full">✕</button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth hide-scrollbar" ref={scrollRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-[1.25rem] px-4 py-2 text-xs leading-relaxed transition-all shadow-sm ${m.role === "user"
                                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-none"
                                    : "bg-white/5 text-gray-100 rounded-bl-none border border-white/10 backdrop-blur-md"
                                    }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}

                        {status === "thinking" && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-white/5 text-blue-400 rounded-[1.25rem] rounded-bl-none border border-white/10 px-4 py-2 text-xs backdrop-blur-md flex items-center gap-1">
                                    <span className="animate-bounce">●</span>
                                    <span className="animate-bounce [animation-delay:-0.15s]">●</span>
                                    <span className="animate-bounce [animation-delay:-0.3s]">●</span>
                                    <span className="ml-1 opacity-60">Reading...</span>
                                </div>
                            </div>
                        )}

                        {showEndOptions && (
                            <div className="flex justify-center gap-2 py-2 animate-fade-in">
                                <button
                                    onClick={handleEndChat}
                                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-bold transition-all"
                                >
                                    End Chat
                                </button>
                                <button
                                    onClick={handleContinueChat}
                                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold transition-all"
                                >
                                    Continue
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-2.5 bg-black/40 border-t border-white/5 flex gap-1.5">
                        <input
                            className="flex-1 bg-gray-900/50 border border-white/10 text-white rounded-full px-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-gray-600"
                            placeholder="Ask me..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        />
                        <button onClick={() => handleSend()} className="w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-500 flex items-center justify-center shadow-lg transition-all active:scale-90">
                            ➤
                        </button>
                    </div>

                    {/* Chat Bubble Tail */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0a0a0a] border-r border-b border-white/10 rotate-45" />
                </div>
            )}


            {/* Character Container */}
            <div
                className={`relative group cursor-pointer select-none ${status === 'walking' || status === 'spinning' ? '' : 'animate-float-character'}`}
                onClick={() => {
                    if (!isDragging) setIsOpen(!isOpen);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsHidden(true);
                }}
                onMouseDown={handleMouseDown}
                style={{ pointerEvents: 'auto' }}
            >
                {renderRobot()}

                {/* Ground Shadow */}
                <div
                    className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-12 h-2.5 bg-black/60 rounded-[100%] blur-md transition-all duration-500 pointer-events-none"
                    style={{
                        transform: `translateX(-50%) scale(${status === "walking" ? 1.4 : 1})`,
                        opacity: status === "sleeping" ? 0.2 : 0.5
                    }}
                />

                {!isOpen && status !== "sleeping" && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 whitespace-nowrap">
                        Helping!
                    </div>
                )}
            </div>

            <style>{`
                @keyframes float-character {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-8px) rotate(1deg); }
                }
                @keyframes float-small {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-2px); }
                }
                @keyframes blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes spin-robot {
                    from { transform: rotateY(0deg) scale(0.75); }
                    to { transform: rotateY(360deg) scale(0.75); }
                }
                .animate-float-character { animation: float-character 3s ease-in-out infinite; }
                .animate-float-small { animation: float-small 2s ease-in-out infinite; }
                .animate-blink { animation: blink 4s infinite; }
                .animate-spin-robot { animation: spin-robot 0.6s ease-in-out; }
                .animate-fade-in-up { animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(15px) translate(-50%, -10px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) translate(-50%, -10px) scale(1); }
                }
            `}</style>
        </div>
    );
}
