import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Geenie } from '@/client/components/Geenie.tsx';

const LOCAL_STORAGE_SESSION_KEY = 'geenie-session-id';

export const App: React.FC = () => {
    const [sessionID] = useState<string>(localStorage.getItem(LOCAL_STORAGE_SESSION_KEY) ?? uuidv4());

    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, sessionID);

    return <Geenie sessionID={sessionID} />;
};
