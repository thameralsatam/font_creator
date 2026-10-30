import React, { createContext, useContext, useMemo, useState } from 'react';

/*
  حالة وضع التعليمات. تعيش داخل الاستوديو فقط (المزوّد يُركَّب في StudioScreen)،
  فإذا غادر المستخدم الاستوديو زالت الحالة كلها وانتهى الوضع تلقائياً.
  خارج المزوّد تكون القيمة الافتراضية "مطفأ" فلا يتأثر أي زر آخر في الموقع.
*/

export interface HelpState {
  on: boolean;
  topicId: string | null;
  setOn: (v: boolean) => void;
  show: (id: string | null) => void;
}

const OFF: HelpState = { on: false, topicId: null, setOn: () => {}, show: () => {} };

const HelpContext = createContext<HelpState>(OFF);

export const useHelp = () => useContext(HelpContext);

export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [on, setOnState] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(null);

  const value = useMemo<HelpState>(
    () => ({
      on,
      topicId,
      setOn: (v) => {
        setOnState(v);
        setTopicId(v ? 'intro' : null);
      },
      show: (id) => setTopicId(id),
    }),
    [on, topicId]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
};
