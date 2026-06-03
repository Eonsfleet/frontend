'use client'

import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Phone, Video, Send, Check, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'

interface Message {
    id: string | number
    sender: 'driver' | 'user'
    text: string
    timestamp: string
    read?: boolean
}

interface TripChatPanelProps {
    driverName?: string
    driverAvatar?: string
    messages?: Message[]
    onSendMessage?: (message: string) => void
}

export function TripChatPanel({ 
    driverName = 'Driver',
    driverAvatar,
    messages = [],
    onSendMessage
}: TripChatPanelProps) {
    const [newMessage, setNewMessage] = useState('')

    const handleSend = () => {
        if (newMessage.trim() && onSendMessage) {
            onSendMessage(newMessage)
            setNewMessage('')
        }
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={driverAvatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                            {getInitials(driverName)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold text-slate-900">Chat with driver</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-blue-50">
                        <Phone className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-blue-50">
                        <Video className="h-4 w-4 text-blue-600" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px]">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        No messages yet
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                    message.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                                }`}
                            >
                                {message.sender === 'driver' && (
                                    <p className="text-xs font-semibold mb-1 opacity-70">
                                        {driverName}
                                    </p>
                                )}
                                <p className="text-sm">{message.text}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className={`text-xs ${message.sender === 'user' ? 'text-blue-100' : 'text-slate-500'}`}>
                                        {format(new Date(message.timestamp), 'h:mm a')}
                                    </span>
                                    {message.sender === 'user' && (
                                        message.read ? (
                                            <CheckCheck className="h-3 w-3 text-blue-100" />
                                        ) : (
                                            <Check className="h-3 w-3 text-blue-100" />
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Hello"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1 bg-slate-50 border-slate-200"
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
