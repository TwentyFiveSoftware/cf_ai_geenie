import React, { type FormEvent, useState } from 'react';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { SendIcon } from 'lucide-react';

type Props = {
    sendChatMessage: (message: string) => void;
};

export const ChatInput: React.FC<Props> = ({ sendChatMessage }) => {
    const [userMessage, setUserMessage] = useState<string>('');

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (userMessage === '') {
            return;
        }

        sendChatMessage(userMessage);

        setUserMessage('');
    };

    return (
        <form onSubmit={onSubmit}>
            <div className="w-full flex bg-muted p-2.5 rounded-[40px]">
                <Input
                    placeholder="Ask anything"
                    className="border-none focus-visible:ring-0"
                    autoFocus
                    value={userMessage}
                    onChange={e => setUserMessage(e.target.value)}
                />
                <Button className="rounded-3xl aspect-square p-0" type="submit" disabled={userMessage === ''}>
                    <SendIcon />
                </Button>
            </div>
        </form>
    );
};
