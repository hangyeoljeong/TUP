import React, { useEffect, useState, useRef } from 'react';
import './ChatRoomMock.css';

const fakeMessages = [
  { sender: '진상윤', text: '안녕하세요, 다들 잘 지내시죠?' },
  { sender: '박정환', text: '네! 오늘 회의는 7시에 하면 될까요?' },
  { sender: '정한결', text: '좋습니다~ 그때 봬요!' },
  { sender: '이명준', text: '회의 끝나면 회의록 정리할게요.' },
  { sender: '진상윤', text: '좋아요, 다들 수고 많으십니다 😊' },
];

function ChatRoomMock() {
  const [messages, setMessages] = useState([]);
  const [index, setIndex] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (index < fakeMessages.length) {
        const startDelay = 7000;
        const delay = index === 0 ? startDelay : 2000;

      const timer = setTimeout(() => {
        setMessages((prev) => [...prev, fakeMessages[index]]);
        setIndex(index + 1);
      }, delay); 
      return () => clearTimeout(timer);
    }
  }, [index]);

  useEffect(() => {
    // 새 메시지 추가되면 자동 스크롤
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="chat-mock-container">
      
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender === '진상윤' ? 'me' : 'other'}`}>
            <strong>{msg.sender}</strong>: {msg.text}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

export default ChatRoomMock;
