import React, { useState, useEffect } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import tupImg from "./tup_img.png";
import "./TeamMatching2.css";
import { useNavigate } from "react-router-dom";
import DrawerMenu from "../components/DrawerMenu";
import { toast } from "react-toastify";

import {
  createTeam,
  getTeamList,
  acceptApplicant,
  applyToTeam,
  sendInvite,
  respondToInvite,
  getApplicants,
  updateUserProfile,
  deleteTeam,
  deregisterProfile,
  getMyApplications,
  toggleReward,
  toggleTeamRoomReward,
  getTeamByMember, getTeamDetails,
  rejectApplicant,
} from "../api/teamup2";


const allSkills = [
  "리더십",
  "기획력",
  "소통",
  "협업",
  "꼼꼼함",
  "책임감",
  "창의력",
  "분석력",
  "논리력",
  "실행력",
  "시간관리",
  "문제해결",
  "열정",
  "끈기",
  "적응력",
  "발표력",
  "공감력",
  "전략적 사고",
  "자기주도성",
];



function TeamMatching2() {
  const [invitations, setInvitations] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [userType, setUserType] = useState(null);
  const [memberRegistered, setMemberRegistered] = useState(false);

  // ✅ 'myProfile' 초기 상태에 9999번 ID를 명시적으로 추가합니다. (버그 1 해결)
  const [myProfile, setMyProfile] = useState({
    user: { 
      id: 9999, // 👈 (핵심 수정)
      username: "이명준",
      name: "이명준"
    },
    skills: [],
    mainRole: "",
    subRole: "",
    keywords: [],
    intro: "",
  });

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    skill: '',
    keywords: [],
    min_rating: '0.0'
  });
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [newTeamInfo, setNewTeamInfo] = useState({
    skills: "",
    lookingFor: "",
    category: "",
    maxMembers: 6,
    intro: "",
  });
  
  const [sentInvites, setSentInvites] = useState([]);
  const [sentApplications, setSentApplications] = useState([]);
  const [inviteMap, setInviteMap] = useState({}); // { userId: [ { id, leader } ] }
  const [applicationMap, setApplicationMap] = useState({}); // { teamId: [ userObj, ... ] }
  const receivedInvites = inviteMap[myProfile.id] || [];
  const receivedApplications = applicationMap[selectedTeam?.id] || [];
  const navigate = useNavigate();
  const [teamList, setTeamList] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [lastCreatedTeam, setLastCreatedTeam] = useState(null); // 마지막으로 생성한 팀 정보를 기억
  const [wasRegisteredAsMember, setWasRegisteredAsMember] = useState(false); // 팀원으로 등록한 사실을 기억
  const [myApplications, setMyApplications] = useState([]);
  const [filter, setFilter] = useState({
  skills: "",
  role: "",
  minRating: 0,
  });
  const [filterMode, setFilterMode] = useState("skills"); // 또는 "role" 기본값
  const [allKeywords, setAllKeywords] = useState([]);
  const [myTeam, setMyTeam] = useState(null);

  const [toastConfirm, setToastConfirm] = useState(null);
  const userId = JSON.parse(localStorage.getItem("user"))?.id || 1;
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeregisterConfirm, setShowDeregisterConfirm] = useState(false);

  useEffect(() => {
  const fetchTeams = async () => {
    try {
      const responseData = await getTeamList();
      // ✅ 응답이 배열인지 확인 후 세팅
      if (Array.isArray(responseData)) {
        setTeamList(responseData);
      } else if (Array.isArray(responseData.teams)) {
        setTeamList(responseData.teams);
      } else {
        setTeamList([]);
      }
    } catch (err) {
      console.error("팀 목록 로딩 실패:", err);
      toast.error("팀 목록 로딩 실패");
      setTeamList([]);
    }
  };
  if (userType) fetchTeams();
}, [userType]);

  // 지원자 필터링 API 호출
useEffect(() => {
  if (!userType || !selectedTeam) return;

  const params = new URLSearchParams();

  // ✅ 백엔드 ApplicantFilterView와 동일한 파라미터명으로 수정
  if (filters.role) params.append('main_role', filters.role);
  if (filters.skill) params.append('skills', filters.skill);
  filters.keywords.forEach(kw => params.append('keyword', kw));

  if (filters.min_rating && parseFloat(filters.min_rating) > 0)
    params.append('rating', filters.min_rating); // ✅ rating으로 변경

  // ✅ 팀장 본인 제외 (leader_id)
  if (myProfile.user?.id) params.append('leader_id', myProfile.user.id);

  // ✅ axios가 params 객체를 serialize하므로 toString() 제거
  getApplicants(Object.fromEntries(params))
    .then(data => setFilteredApplicants(data))
    .catch(err => console.error("지원자 필터링 실패:", err));
}, [filters, userType, selectedTeam?.id, myProfile.user?.id]);



  // 키워드 버튼 클릭 핸들러
  const handleKeywordClick = (keyword) => {
    setFilters(prev => {
      const newKeywords = prev.keywords.includes(keyword)
        ? prev.keywords.filter(k => k !== keyword)
        : [...prev.keywords, keyword];
      return { ...prev, keywords: newKeywords };
    });
  };
  


useEffect(() => {
  const fetchTeams = async () => {
    try {
      const responseData = await getTeamList();
      console.log("팀 목록 응답:", responseData);

      // ✅ 응답이 배열인지, 객체인지 구분해서 처리
      if (Array.isArray(responseData)) {
        setTeamList(responseData);
      } else if (Array.isArray(responseData.teams)) {
        setTeamList(responseData.teams);
      } else if (Array.isArray(responseData.data)) {
        setTeamList(responseData.data);
      } else {
        console.warn("알 수 없는 응답 구조:", responseData);
        setTeamList([]);
      }

    } catch (err) {
      toast.error("팀 목록을 불러오는 데 실패했습니다.");
      console.error("팀 목록 로딩 오류:", err);
      setTeamList([]);
    }
  };

  if (userType) {
    fetchTeams();
  }
}, [userType]);


useEffect(() => {
  const fetchInitialData = async () => {
    try {
      const realApplicants = await getApplicants();
      setApplicants(realApplicants || []);
    } catch (err) {
      toast.error("지원자 목록을 불러오는 데 실패했습니다.");
      console.error(err);
    }
  };
  fetchInitialData();
}, []); // ✅ 이렇게만 수정

useEffect(() => {
  getMyApplications(9999).then((data) => setMyApplications(data));
}, [wasRegisteredAsMember, selectedTeam]);


useEffect(() => {
  if (userType === "member" && memberRegistered && myProfile?.user?.id) {
    (async () => {
      try {
        const data = await getMyInvites(myProfile.user.id);
        setInvitations(data || []);
      } catch (err) {
        console.error("받은 초대 목록 로딩 실패:", err);
      }
    })();
  }
}, [userType, memberRegistered, myProfile?.user?.id]);


const handleToggleTeamRoomReward = (teamId) => {
  const isActive = myTeam?.has_reward;

  setToastConfirm({
    title: isActive ? "팀 리워드 해제" : "팀 리워드 사용",
    message: isActive
      ? "팀 리워드를 해제하시겠습니까?<br><small>사용 중인 리워드는 회수됩니다.</small>"
      : "현재 보유 중인 <strong>4개의 리워드</strong> 중 1개를 사용하시겠습니까?",
    confirmText: isActive ? "해제" : "사용",
    cancelText: "취소",
    onConfirm: async () => {
      try {
        const res = await toggleTeamRoomReward(teamId);
        toast.success(res.message || "팀 리워드 상태가 변경되었습니다.");
        setMyTeam((prev) => ({ ...prev, has_reward: res.has_reward }));
      } catch {
        toast.error("팀 리워드 상태 변경 중 오류가 발생했습니다.");
      }
      setToastConfirm(null);
    },
  });
};


  const sourceTeams = teamList.length ? teamList : [];

  
  const refetchTeams = async () => {
    try {
      const res = await getTeams();       // 🔁 팀 목록 불러오기 (이미 있는 함수일 것)
      setTeamList(res);                   // 🧠 팀 목록 상태 업데이트
    } catch (err) {
    console.error("팀 다시 불러오기 실패:", err);
  }
};

  const forceAccept = async (applicant) => {
    // API 연동
    try {
      await acceptApplicant(selectedTeam.id, applicant.id);
      toast.success("지원자를 팀에 추가했어요!");
    } catch (err) {
      toast.error("추가 실패");
      console.error(err);
    }
  };




const toggleKeyword = (kw) => {
    setMyProfile((p) => {
      const has = p.keywords.includes(kw);
      const next = has
        ? p.keywords.filter((x) => x !== kw)
        : p.keywords.length < 3
        ? [...p.keywords, kw]
        : p.keywords;
      return { ...p, keywords: next };
    });
  };

const handleCreateTeam = async () => {
  const { skills, lookingFor, category, maxMembers, intro } = newTeamInfo;
  const { name, mainRole, subRole, keywords } = myProfile;
  
  if (
    !skills.trim() ||
    !lookingFor.trim() ||
    !category.trim() ||
    !intro.trim() ||
    !mainRole.trim() ||
    !subRole.trim() ||
    (keywords || []).length === 0 ||
    !maxMembers ||
    maxMembers < 1
  ) {
    toast.warning("모든 입력 칸을 채워주세요.");
    return;
  }

  const teamData = {
    user_id: "9999",
    leader_name: "이명준",
    looking_for: lookingFor.split(",").map(s => s.trim()),
    category,
    max_members: maxMembers,
    intro,
    main_role: myProfile.mainRole,
    sub_role: myProfile.subRole,
    skills: newTeamInfo.skills.split(",").map(s => s.trim()),
    keywords: myProfile.keywords,
  };

  try {
    const response = await createTeam(teamData);
    const newTeam = response.data || response;

    // ✅ 핵심 추가
    setMyTeam(newTeam); // 💥 이 한 줄로 myTeam 상태 업데이트

    setSelectedTeam(newTeam);
    setLastCreatedTeam(newTeam);
    setSentInvites([]);

    toast.success("팀이 성공적으로 생성되었습니다!");
  } catch (err) {
    console.error("팀 생성 실패:", err);
    toast.error("팀 생성에 실패했습니다.");
  }
};

// 1. (수정) "삭제하기" 버튼을 누르면 이 함수가 실행되어 모달 스위치를 켭니다.
const handleDeleteTeam = async () => {
  if (!selectedTeam || !selectedTeam.id) {
    toast.error("삭제할 팀이 없습니다.");
    return;
  }
  // ❌ window.confirm() 대신,
  // ✅ 모달을 띄우는 스위치만 켭니다.
  setShowDeleteConfirm(true);
};

// 2. (신규) 모달의 "삭제" 버튼을 누르면 이 함수가 실행됩니다.
const onConfirmDelete = async () => {
  if (!selectedTeam || !selectedTeam.id) return; // 안전장치

  const teamId = selectedTeam.id;

  // ✅ 삭제 로직 실행 전에 상태를 먼저 초기화합니다.
  setSelectedTeam(null);
  setLastCreatedTeam(null);
  setSentInvites([]); // (초대 기록 초기화 - 기존에 있었음)

  try {
    // --- 기존 삭제 로직 ---
    await deleteTeam(teamId);          // 실제 삭제 요청
    toast.success("팀이 성공적으로 삭제되었습니다.");
    await refetchTeams();              // 팀 목록 다시 불러오기
    handleBack();                      // 뒤로 가기
    // ---------------------
  } catch (err) {
    toast.error("팀 삭제 중 오류가 발생했습니다.");
    console.error("팀 삭제 오류:", err);
  } finally {
    // ✅ 모달을 닫습니다.
    setShowDeleteConfirm(false);
  }
};

const UserProfileCardContent = ({ user }) => {
  if (!user) return null; // 유저 정보가 없으면 아무것도 표시 안 함

  return (
    <div className="user-profile-card-content">
      <p><strong>기술 스택:</strong> {user.skills?.join(', ') || '미정'}</p>
      <p><strong>희망 역할군:</strong> {user.main_role || '미정'}</p>
      <p><strong>보조 역할군:</strong> {user.sub_role || '미정'}</p>
      <p><strong>보유 역량:</strong> {user.keywords?.join(', ') || '없음'}</p>
      <p><strong>한 줄 소개:</strong> {user.intro || '없음'}</p>
      <p>⭐ {user.rating?.toFixed(1) ?? 0} (참여 {user.participation ?? 0}회)</p>
    </div>
  );
};

const handleApply = (team) => {
    setApplicationMap((prev) => {
      const updated = { ...prev };
      if (!updated[team.id]) updated[team.id] = [];
      if (!updated[team.id].some((u) => u.id === myProfile.id)) {
        updated[team.id].push(myProfile);
      }
      return updated;
    });
  };


const handleToggleReward = (userId) => {
  const isActive = myProfile?.has_reward;
  setToastConfirm({
    title: isActive ? "리워드 해제" : "리워드 사용",
    message: isActive
      ? "리워드를 해제하시겠습니까?<br><small>사용 중인 리워드는 회수됩니다.</small>"
      : "현재 보유 중인 <strong>4개의 리워드</strong> 중 1개를 사용하시겠습니까?",
    confirmText: isActive ? "해제" : "사용",
    cancelText: "취소",
    onConfirm: async () => {
      try {
        const res = await toggleReward(userId);
        toast.success(res.message || "리워드 상태가 변경되었습니다.");
        setMyProfile((prev) => ({ ...prev, has_reward: res.has_reward }));
      } catch {
        toast.error("리워드 변경 중 오류가 발생했습니다.");
      }
      setToastConfirm(null);
    },
  });
};



  //팀원 등록
  // 팀원 등록
const handleApplyMember = async () => {
  const { skills, mainRole, subRole, intro, keywords } = myProfile;

  if (
    skills.length === 0 ||
    !mainRole.trim() ||
    !subRole.trim() ||
    !intro.trim() ||
    keywords.length === 0
  ) {
    toast.warning("모든 항목을 입력해주세요!");
    return;
  }

  // ✅ snake_case로 변환해서 보낼 객체 구성
  const profileData = {
    skills,
    keywords,
    main_role: mainRole,
    sub_role: subRole,
    intro, // ❓ intro는 모델에 없으니 필요 없으면 제거하거나 백엔드에 추가 필요
    has_reward: true, // 혹시 필요한 경우
  };

  try {
    await updateUserProfile(profileData);

    toast.success("프로필이 성공적으로 등록되었습니다!");
    setMemberRegistered(true);
    setWasRegisteredAsMember(true);
  } catch (err) {
    console.error("프로필 등록 오류:", err);
    toast.error("프로필 등록 중 오류가 발생했습니다.");
  }
};

const handleInvite = async (targetUser) => {
  if (!selectedTeam || !selectedTeam.id) {
    toast.error("선택된 팀이 없습니다.");
    return;
  }

  try {
    // ✅ 1. 백엔드가 돌려준 '진짜' 초대장 데이터를 받습니다.
    // ⭐️ 'targetUser.id'가 아닌 'targetUser.user_id'를 사용해야 합니다. (WaitingPoolListSerializer 기준)
    const response = await sendInvite(selectedTeam.id, targetUser.user_id); 
    const newInvitation = response.data; // 🌟

    toast.success("초대가 완료되었습니다!");

    // ✅ 2. '가짜' targetUser 대신 '진짜' newInvitation 객체를 상태에 저장
    setSentInvites(prev => [...prev, newInvitation]);

  } catch (err) {
    toast.error("초대 실패");
    console.error(err);
  }
};

// ✅ "테스트 수락"을 처리할 새 함수
const handleSimulateAcceptInvite = async (invite) => {
  if (!invite || !invite.id) {
    toast.error("초대 정보가 올바르지 않습니다.");
    return;
  }

  try {
    // 1. 실제 API 호출
    await respondToInvite(invite.id, true);
    toast.success(`'${invite.user?.name || '초대자'}'님의 초대를 (테스트) 수락했습니다!`);

    // 2. "초대한 사람 목록"(sentInvites)에서 제거
    setSentInvites((prev) => prev.filter((inv) => inv.id !== invite.id));

    // 3. "팀원 현황"(selectedTeam.members)에 즉시 추가
    const newMember = {
      id: invite.user.id, // (임시 UI용 ID)
      role: 'member',
      status: 'active',
      user: invite.user // 🌟 초대장에 포함된 상세 user 객체
    };
    setSelectedTeam(prevTeam => ({
      ...prevTeam,
      members: [...(prevTeam.members || []), newMember]
    }));

    // 4. "팀을 찾고 있는 사람"(오른쪽 목록)에서 제거
    setFilteredApplicants((prev) => prev.filter((u) => u.user_id !== invite.user.id));

  } catch (err) {
    toast.error("초대 수락(테스트)에 실패했습니다.");
    console.error(err);
  }
};

const handleBack = () => {
    setUserType(null);
    setMemberRegistered(false);
    setSelectedTeam(null);
  };

const handleApplyToTeam = async (team) => {
  try {
    // 현재 로그인된 사용자 id 가져오기 (상황에 따라 맞게 조정)
    const currentUserId =
      myProfile?.user?.id || myProfile?.id || window.userId || 9999;

    // ✅ 선택한 팀 id와 현재 유저 id로 신청 API 호출
    await applyToTeam(team.id, currentUserId);
    toast.success("팀에 신청했습니다!");

    // ✅ 신청 직후 목록 다시 불러오기 (UI 즉시 반영)
    const updatedApplications = await getMyApplications(currentUserId);
    setMyApplications(updatedApplications);

  } catch (e) {
    console.error("신청 중 오류:", e);
    toast.error("신청 중 오류가 발생했습니다.");
  }
};

// ✅ 초대 수락 후 팀 정보 불러오는 함수
const fetchMyTeamAfterAccept = async () => {
  try {
    if (!myProfile?.user?.id) {
      console.warn("⚠️ myProfile.user.id가 아직 로드되지 않았습니다.");
      return;
    }

    const teamData = await getTeamByMember(myProfile.user.id);

    if (teamData) {
      setSelectedTeam({ ...teamData });
      setMyTeam(teamData);

      if (teamData.user_id === myProfile.user.id) {
        setUserType("leader");
      } else {
        setUserType("member");
      }

      setMemberRegistered(true);
      console.log("✅ fetchMyTeamAfterAccept(): 팀 정보 갱신 완료", teamData);
    } else {
      toast.error("팀 정보를 불러오지 못했습니다.");
    }
  } catch (err) {
    console.error("❌ fetchMyTeamAfterAccept() 오류:", err);
  }
};

// ✅ 초대 수락 핸들러 (최종 안정판)
const handleAcceptInvite = async (inviteId) => {
  try {
    // 1️⃣ 초대 수락 API 호출
    const res = await respondToInvite(inviteId, true);
    toast.success(res.data?.message || "초대를 수락했어요!");

    // 2️⃣ 초대 목록에서 제거
    setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));

    // ✅ 3️⃣ 팀 정보 즉시 새로고침
    await fetchMyTeamAfterAccept();

    // ✅ 4️⃣ 화면 전환 UX
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.info("팀룸으로 이동했습니다!");
    }, 200);
  } catch (err) {
    console.error("❌ 초대 수락 중 오류:", err);
    toast.error(
      err.response?.data?.message || "초대 수락 중 오류가 발생했습니다."
    );
  }
};

useEffect(() => {
  if (userType === "member" && memberRegistered && selectedTeam) {
    // 렌더 강제 보정
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("팀룸으로 이동했습니다!");
  }
}, [userType, memberRegistered, selectedTeam]);


const handleRejectInvite = async (inviteId) => {
  try {
    const res = await respondToInvite(inviteId, false);
    toast.success(res.data?.message || "초대를 거절했어요.");

    // ✅ 거절된 초대 목록에서 제거
    setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
  } catch (err) {
    console.error("❌ 초대 거절 중 오류:", err);
    toast.error(err.response?.data?.message || "초대 거절 중 오류가 발생했습니다.");
  }
};

const handleRejectApplication = async (app) => { // 'app' 객체를 받음
  try {
    await rejectApplicant(app.id); // ✅ app.id (Application ID) 사용
    toast.success(`${app.user?.name || '신청자'} 님의 신청을 거절했습니다.`); // ✅ (버그 3 해결)
    
    // ✅ "신청자 목록"(왼쪽 아래)에서 제거
    setApplicationMap((prev) => {
      const updated = { ...prev };
      const teamId = selectedTeam.id;
      if (updated[teamId]) {
        updated[teamId] = updated[teamId].filter(
          (a) => a.id !== app.id
        );
      }
      return updated;
    });

  } catch (err) {
    toast.error("신청 거절에 실패했습니다.");
    console.error("거절 중 오류 발생:", err);
  }
};

const fetchInvites = async () => {
  try {
    const data = await getMyInvites(myProfile.user.id);
    setInvitations(data || []);
  } catch (err) {
    console.error("초대 목록 불러오기 실패:", err);

  }
};

useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const data = await getApplicants();
        setApplicants(data);
      } catch (err) {
        console.error("지원자 불러오기 실패", err);
      }
    };
    fetchApplicants();
  }, []);

useEffect(() => {
  if (userType === "member" && memberRegistered && myProfile?.user?.id) {
    fetchInvites();  // ✅ 이제 인식됨
  }
}, [userType, memberRegistered, myProfile?.user?.id]);

const handleResumeAsLeader = () => {
    setUserType('leader');
    setSelectedTeam(lastCreatedTeam);
  };

  const handleResumeAsMember = () => {
    setUserType('member');
    setMemberRegistered(true);
  };

const renderTeamSlots = (team) => {
  if (!Array.isArray(team?.members)) {
    console.warn("renderTeamSlots: team.members가 유효하지 않습니다.", team);
    return <p>팀 멤버 정보 로딩 중 오류가 발생했습니다.</p>;
  }

  return team.members.map((member, idx) => {
    // ✅ 'member.user' 객체에서 올바른 데이터를 가져옵니다.
    const user = member.user;
    const isLeader = member.role === 'leader';

    const name = user?.name || "이름 없음";
    
    // ✅ (핵심 수정) 팀장이면 'team'에서, 팀원이면 'user'에서 정보를 가져옵니다.
    const skills = (isLeader ? team.skills : user?.skills)?.join(", ") || "미정";
    const mainRole = (isLeader ? team.main_role : user?.main_role) || "미정";
    const subRole = (isLeader ? team.sub_role : user?.sub_role) || "미정";
    const keywords = (isLeader ? team.keywords : user?.keywords)?.join(", ") || "없음";
    
    const rating = user?.rating ?? 0;
    const participation = user?.participation ?? 0;

    return (
      <div key={idx} className="team-member-card" style={{ width: "95%" }}>
        <p>
          <strong className="user-hover-trigger">
            {name} {isLeader ? '(팀장)' : ''}
            <div className="user-profile-card">
              <UserProfileCardContent user={user} />
            </div>
          </strong>
        </p>
        <p>기술 스택: {skills}</p>
        <p>희망 역할군: {mainRole}</p>
        <p>보조 역할군: {subRole}</p>
        <p>키워드: {keywords}</p>
        <p>⭐ {rating.toFixed(1)} 참여({participation}회)</p>
      </div>
    );
  });
};

// 1. (수정) "팀원 등록 해제" 버튼을 누르면 이 함수가 실행됩니다.
const handleDeregisterMember = async () => {
  // ✅ 커스텀 모달 띄우기 (이전 답변에서 추가한 로직)
  setShowDeregisterConfirm(true); 
};

// 2. (신규) 모달의 "등록 해제" 버튼을 누르면 이 함수가 실행됩니다.
const onConfirmDeregister = async () => {
  try {
    // --- 기존 등록 해제 로직 ---
    const res = await deregisterProfile();
    console.log("삭제 응답:", res);

    toast.success(
      res?.message || (selectedTeam ? "팀에서 나갔습니다." : "등록이 해제되었습니다."),
      { autoClose: 3000 }
    );

    setMyApplications([]);
    setInvitations([]);
    setWasRegisteredAsMember(false);
    handleBack();

  } catch (err) {
    console.error("등록 해제 오류:", err);
    toast.error("등록 해제 중 예기치 않은 오류가 발생했습니다.", {
      autoClose: 5000,
    });
    setTimeout(() => handleBack(), 300); // 에러 시에도 복귀
  } finally {
    // ✅ 모달을 닫습니다.
    setShowDeregisterConfirm(false);
  }
};

//-----------------------------------------
// 테스트 신청 버튼입니다.
//------------------------------------------
const handleSimulateApply = async (applicant) => {
  if (!selectedTeam || !selectedTeam.id) {
    toast.error("팀이 선택되지 않았습니다.");
    return;
  }
  if (!applicant || !applicant.user_id) {
    toast.error("신청자 정보가 올바르지 않습니다.");
    return;
  }

  try {
    // 1. 실제 API 호출하고 *응답을 캡처*합니다.
    //    (TeamApplyView는 {"message": "...", "data": {...}}를 반환합니다)
    const response = await applyToTeam(selectedTeam.id, applicant.user_id);
    const newApplication = response.data; // ✅ 백엔드가 돌려준 "진짜" 신청서 데이터

    if (!newApplication || !newApplication.id) {
      console.error("API 응답에 신청서 데이터가 없습니다:", response);
      toast.error("신청은 되었으나 응답 데이터에 문제가 있습니다.");
      return;
    }

    toast.success(`${applicant.user_name || '지원자'}님이 팀에 (테스트) 신청했습니다!`);

    // 2. "신청자 목록" UI에 *백엔드가 돌려준 실제 데이터*로 즉시 반영합니다.
    setApplicationMap((prev) => {
      const updated = { ...prev };
      const teamId = selectedTeam.id;
      if (!updated[teamId]) updated[teamId] = [];
      
      // 중복 신청 방지 (UI) - 실제 Application ID로 확인
      if (!updated[teamId].some((a) => a.id === newApplication.id)) {
        // ❌ '가짜' appData를 만들 필요 없이,
        // ✅ 백엔드가 돌려준 '진짜' newApplication 데이터를 그대로 추가합니다.
        updated[teamId].push(newApplication);
      }
      return updated;
    });

  } catch (err) {
    console.error("테스트 신청 오류:", err);
    // 400 Bad Request (백엔드에서 "이미 신청한 팀"이라고 응답한 경우)
    if (err.response && err.response.data && err.response.data.message) {
      toast.error(err.response.data.message);
    } else {
      toast.error("테스트 신청 중 오류가 발생했습니다.");
    }
  }
};


const handleAcceptApplication = async (app) => {
  try {
    await acceptApplicant(selectedTeam.id, app.id);
    toast.success(`${app.user?.name || '신청자'} 님의 신청을 수락했습니다.`);

    // 신청자 목록에서 제거
    setApplicationMap(prev => {
      const updated = { ...prev };
      const teamId = selectedTeam.id;
      if (updated[teamId]) {
        updated[teamId] = updated[teamId].filter(a => a.id !== app.id);
      }
      return updated;
    });

    // 팀원 목록에 추가
    const newMember = {
      id: app.user.id,
      role: "member",
      status: "active",
      user: app.user
    };
    setSelectedTeam(prev => ({
      ...prev,
      members: [...(prev.members || []), newMember]
    }));

    // 오른쪽 목록(지원자)에서 즉시 제거
    setFilteredApplicants(prev => prev.filter(u => u.user_id !== app.user.id));

    // 🔥 (수정 핵심) 서버 반영 딜레이 고려: 1초 뒤에 새로고침
    setTimeout(async () => {
      const refreshed = await getApplicants();
      // ✅ 새로고침 후에도 이미 팀원이 된 유저는 제외
      setFilteredApplicants(refreshed.filter(u => u.user_id !== app.user.id));
    }, 1000);

  } catch (err) {
    console.error("수락 중 오류 발생:", err);
    toast.error("신청 수락에 실패했습니다.");
  }
};


const handleSimulateTeamInvite = async (team) => {
  if (!myProfile.user?.id) {
    toast.error("사용자 ID(9999)를 찾을 수 없습니다.");
    return;
  }
  
  try {
    // API 호출: team.id가 '나' (myProfile.user.id)를 초대
    const response = await sendInvite(team.id, myProfile.user.id);
    const newInvite = response.data; // 백엔드가 반환한 '진짜' 초대장
    
    toast.success(`'${team.leader_name}' 님의 팀이 (테스트) 초대를 보냈습니다!`);

    // '받은 초대' 목록(UI)에 즉시 반영
    setInvitations(prev => [...prev, newInvite]);

  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      toast.error(err.response.data.message);
    } else {
      toast.error("테스트 초대 중 오류가 발생했습니다.");
    }
    console.error("테스트 초대 오류:", err);
  }
};

// ✅ 2. (새 함수) "신청한 팀" 목록에서 팀장이 내 신청을 수락하는 것을 시뮬레이션
const handleSimulateAcceptance = async (app) => {
  try {
    // API 호출: 팀장이 '나'의 신청(app.id)을 수락
    await acceptApplicant(app.team, app.id);
    toast.success(`'${app.team_leader_name}' 님이 (테스트) 신청을 수락했습니다!`);

    // '신청한 팀' 목록(UI)에서 제거
    setMyApplications(prev => prev.filter(a => a.id !== app.id));

    // (핵심) 수락된 팀의 상세 정보를 불러와 'selectedTeam'으로 설정
    // UI가 "내 팀 정보" 화면으로 자동 전환됩니다.
    const teamDetails = await getTeamDetails(app.team);
    setSelectedTeam(teamDetails);

  } catch (err) {
    toast.error("테스트 수락 중 오류가 발생했습니다.");
    console.error("테스트 수락 오류:", err);
  }
};


const PopularStats = ({ applicants = [] }) => {
    // 1. 역할군 카운트
    const roleCounts = {};
    applicants.forEach((u) => {
      const role = u.main_role?.trim();
      if (role) roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    // 2. 비율 및 정렬 계산
    const entries = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const threshold = 0.05;
    const major = entries.filter(([, count]) =>
      total ? count / total >= threshold : false
    );
    const etc = entries.filter(([, count]) =>
      total ? count / total < threshold : false
    );
    const etcCount = etc.reduce((sum, [, count]) => sum + count, 0);

    // 3. 추천 공모전
    const recommendList = [
      "소프트웨어 마에스트로",
      "산학협력 프로젝트 챌린지",
      "네이버 해커톤",
      "삼성 주니어 SW 창작대회",
    ];

    // ✅ 여기서 바로 JSX 리턴
    return (
      <div className="right-widget-section">
        {/* 인기 역할군 단순 목록 */}
        <div className="widget-box">
          <h3>💡 인기 있는 역할군</h3>
          <ul>
            {entries.map(([role, count]) => (
              <li key={role}>
                <strong>{role}</strong>: {count}명
              </li>
            ))}
            {entries.length === 0 && <li>데이터 없음</li>}
          </ul>
        </div>

        {/* 비율 막대 */}
        <div className="widget-box">
          <h4>📊 대기자 역할군별 비율</h4>
          {major.map(([role, count]) => {
            const percent = total ? ((count / total) * 100).toFixed(0) : 0;
            return (
              <div key={role} className="role-bar-wrapper">
                <div>{role}</div>
                <div className="role-bar-container">
                  <div
                    className="role-bar"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
                <div className="role-percentage">{percent}%</div>
              </div>
            );
          })}
          {etcCount > 0 && total > 0 && (
            <div className="role-bar-wrapper">
              <div>기타</div>
              <div className="role-bar-container">
                <div
                  className="role-bar"
                  style={{ width: `${((etcCount / total) * 100).toFixed(0)}%` }}
                ></div>
              </div>
              <div className="role-percentage">
                {((etcCount / total) * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>

        {/* 추천 공모전 */}
        <div className="widget-box recommend-box">
          <h4>📌 추천 공모전</h4>
          <ul>
            {recommendList.map((r, i) => (
              <li key={i}>✅ {r}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="team-matching-container">
      {/* 헤더 */}
      <header className="team-matching-header">
        <span className="logo">TUP!</span>
        {!drawerOpen && (
          <button
            className="menu-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="메뉴 열기"
          >
            <MenuIcon style={{ fontSize: "2.2rem", color: "#FF6B35" }} />
          </button>
        )}
      </header>

      {/* 드로어 메뉴 */}
      <DrawerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        openMenus={openMenus}
        onToggle={setOpenMenus}
      />

{!selectedTeam && (
<div className="matching-intro">
  {!userType ? (
    <>
      {/* ✅ H1과 P를 !userType 안으로 이동 */}
      <h1>
        <span className="highlight">OpenTeamUp</span> - 자유롭게 팀 결성하기
      </h1>
      <p>
        원하는 팀장을 선택하거나, 나만의 팀을 만들어 자유롭게 팀원을
        구성해보세요
      </p>

      {/* 역할 선택 버튼 */}
      <div className="role-toggle">
        {lastCreatedTeam ? (
          <button onClick={handleResumeAsLeader}>👩‍💼 내 팀으로 돌아가기</button>
        ) : wasRegisteredAsMember ? (
          <button onClick={handleResumeAsMember}>👨‍👩‍👧‍👦 팀 계속 찾기</button>
        ) : (
          <>
            <button onClick={() => setUserType("leader")}>👩‍💼 팀장 시작</button>
            <button onClick={() => setUserType("member")}>👨‍👩‍👧‍👦 팀원 시작</button>
          </>
        )}
      </div>
      {!userType && (
      <div className="matching-desc">
        <img src={tupImg} alt="팀 매칭 설명" className="matching-image" />
        <p>팀장 또는 팀원이 되어 OpenTeamUP을 시작해보세요</p>
      </div>
    )}
    </>
  ) : (
    <>
      {/* ✅ userType이 선택되면 "뒤로가기" 버튼만 표시 */}


      {/* ✅ "팀장으로 시작" 헤더를 이곳으로 이동! */}
      {userType === "leader" && !selectedTeam && (
        <div className="leader-header">

          <h1 className="leader-title">
            <span className="highlight">OpenTeamUp — 팀장으로 시작</span>
          </h1>
          <div className="leader-desc">
            <p>
              👑 팀장 모드에서는 나만의 팀을 만들고 팀원을 모집할 수 있습니다.
              대기 중인 팀원들이 당신의 팀을 확인하고 <strong>신청</strong>할 수 있습니다.
            </p>
            <ul>
              <li>팀의 목적, 역할군, 인원수를 명확히 설정하세요.</li>
              <li>한 줄 소개와 기술 스택은 지원자의 관심을 끌기 좋습니다.</li>
              <li>리워드 사용 시 팀이 상단에 노출되어 더 많은 신청을 받을 수 있습니다.</li>
              <li>생성된 팀은 언제든 수정하거나 삭제할 수 있습니다.</li>
            </ul>
          </div>
          <div className="back-centered">
            <button className="back-button" onClick={handleBack}>
              🔙 뒤로가기
            </button>
          </div>
        </div>
        
      )}
      
      {/* ✅ (선택사항) 여기에 '팀원으로 시작' 헤더도 추가할 수 있습니다. */}
      {userType === "member" && !memberRegistered && (
         <div className="leader-header"> {/* CSS 재사용 */}
           <h1 className="leader-title">
             <span className="highlight">OpenTeamUp — 팀원으로 시작</span> 
           </h1>
           <div className="leader-desc">
             <p>
              👨‍👩‍👧‍👦 팀원 모드에서는 프로필을 등록하여 팀장에게 나를 알릴 수 있습니다.
             </p>
             <ul>
               <li>나의 기술 스택, 역할군, 역량 키워드를 등록하세요.</li>
               <li>팀장이 내 프로필을 보고 마음에 들면 초대를 보낼 수 있습니다.</li>
               <li>직접 마음에 드는 팀을 찾아 신청을 보낼 수 있습니다.</li>
             </ul>
           </div>
          <div className="back-centered">
            <button className="back-button" onClick={handleBack}>
              🔙 뒤로가기
            </button>
          </div>
         </div>
      )}
    </>
  )}
</div>
)}

      <div className="main-content">
        <div className="left-pane">
          {userType === "leader" && !selectedTeam && (
            
            <div className="team-create-form">
              <h3>팀 생성하기</h3>
              <input
                type="text"
                placeholder="모집 역할군"
                value={newTeamInfo.lookingFor}
                onChange={(e) =>
                  setNewTeamInfo({ ...newTeamInfo, lookingFor: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="공모전 분야"
                value={newTeamInfo.category}
                onChange={(e) =>
                  setNewTeamInfo({ ...newTeamInfo, category: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="모집 인원"
                value={newTeamInfo.maxMembers}
                onChange={(e) =>
                  setNewTeamInfo({
                    ...newTeamInfo,
                    maxMembers: +e.target.value,
                  })
                }
              />
              <input
                type="text"
                placeholder="한 줄 소개"
                value={newTeamInfo.intro}
                onChange={(e) =>
                  setNewTeamInfo({ ...newTeamInfo, intro: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="기술 스택"
                value={newTeamInfo.skills}
                onChange={(e) =>
                  setNewTeamInfo({ ...newTeamInfo, skills: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="희망 역할군"
                value={myProfile.mainRole}
                onChange={(e) =>
                  setMyProfile({ ...myProfile, mainRole: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="보조 가능 역할군"
                value={myProfile.subRole}
                onChange={(e) =>
                  setMyProfile({ ...myProfile, subRole: e.target.value })
                }
              />
              <div className="keyword-section">
                <p className="keyword-label">
                  나의 역량 키워드 (최대 3개 선택)
                </p>
                <div className="keyword-list">
                  {allSkills.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      className={`keyword-btn ${
                        myProfile.keywords.includes(kw) ? "selected" : ""
                      }`}
                      onClick={() => toggleKeyword(kw)}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
              <button className="cta-button" onClick={handleCreateTeam}>
                Save!
              </button>
            </div>
          )}

          {userType === "member" && !memberRegistered && (
            <div className="team-create-form">
              <h3>팀원 등록하기</h3>
              <input
                type="text"
                placeholder="기술 스택"
                value={myProfile.skills.join(",")}
                onChange={(e) =>
                  setMyProfile({
                    ...myProfile,
                    skills: e.target.value.split(","),
                  })
                }
              />
              <input
                type="text"
                placeholder="희망 역할군"
                value={myProfile.mainRole}
                onChange={(e) =>
                  setMyProfile({ ...myProfile, mainRole: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="보조 가능 역할군"
                value={myProfile.subRole}
                onChange={(e) =>
                  setMyProfile({ ...myProfile, subRole: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="한 줄 소개"
                value={myProfile.intro}
                onChange={(e) =>
                  setMyProfile({ ...myProfile, intro: e.target.value })
                }
              />
              <div className="keyword-section">
                <p className="keyword-label">보유 역량 (최대 3개)</p>
                <div className="keyword-list">
                  {allSkills.map((kw) => {
                    const selectedKeywords = myProfile.keywords || [];
                    const isSelected = selectedKeywords.includes(kw);

                    return (
                      <button
                        key={kw}
                        type="button"
                        className={`keyword-btn ${
                          isSelected ? "selected" : ""
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            // 키워드 제거
                            setMyProfile((prev) => ({
                              ...prev,
                              keywords: selectedKeywords.filter(
                                (k) => k !== kw
                              ),
                            }));
                          } else {
                            if (selectedKeywords.length >= 3) {
                              // ✅ 알림 확실히 호출
                              setTimeout(() => {
                                alert(
                                  "역량 키워드는 최대 3개까지 선택할 수 있어요!"
                                );
                              }, 10);
                              return;
                            }

                            // 키워드 추가
                            setMyProfile((prev) => ({
                              ...prev,
                              keywords: [...selectedKeywords, kw],
                            }));
                          }
                        }}
                      >
                        {kw}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button className="cta-button" onClick={handleApplyMember}>
                Save!
              </button>
            </div>
          )}

          {userType === "member" && memberRegistered && !selectedTeam && (
            <>
              <div className="log-section"></div>
              <div className="list-scroll">
              <>
              <h3 style={{ padding: '0.5rem 0.2rem', borderBottom: '2px solid #f0f0f0' }}>
                팀 목록
              </h3>
                {sourceTeams.length === 0 && (
                <div style={{ textAlign: "center", padding: "50px", color: "#888" }}>
                  <p>생성된 팀이 없습니다.</p>
                </div>
                )}

                {/* sourceTeams 배열에 내용이 있을 경우에만, 기존처럼 팀 목록을 보여줍니다. */}
                {sourceTeams.length > 0 &&
                sourceTeams.map((team) => {
                  const currentMembers = team.current_member_count || 0; 
                  const maxMembers = team.max_members;
                  const isFull = currentMembers >= maxMembers;
                  const statusText = isFull ? "모집완료" : "모집중";

return (
  // ✅ 1. 최상위 div에 flex와 CSS 클래스('room-card-wrapper')를 적용합니다.
  <div key={team.id} className="room-card-wrapper">
    
    {/* 🔸 왼쪽 — 팀 상세 정보 */}
    <div className="team-info">
      <h4>{team.leader_name}님의 팀</h4>
      {team.has_reward && (
        <span className="reward-badge">👑 리워드 사용중!!</span>
      )}
      <p>모집 역할군 : {(team.looking_for || []).join(", ")}</p>
      <p>공모전 분야 : {team.category || "미지정"}</p>
      <p>한 줄 소개 : {team.intro}</p>
      <p>
        모집 인원 :{" "}
        <strong>
          {currentMembers} / {maxMembers}
        </strong>
      </p>
      <div className="status-and-button">
        <span className={`status-badge ${isFull ? "closed" : "open"}`}>
          {statusText}
        </span>
      </div>
      <br />
      <button
        className="cta-button"
        onClick={() => handleApplyToTeam(team)}
      >
        신청하기
      </button>
      <button
          className="sample-button"
          onClick={() => handleSimulateTeamInvite(team)}
          title="이 팀이 나에게 초대를 보내는 것을 시뮬레이션합니다."
          >
          (테스트) 초대
      </button>
    </div>

    {/* 🔸 오른쪽 — 현재 팀원 목록 섹션 */}
    <div className="team-members-box">
      <h4>현재 팀원</h4>
      {/* ✅ 2. team.members 배열을 순회하며 팀원을 표시합니다. */}
      {team.members && team.members.length > 0 ? (
        <ul className="member-list">
          {team.members.map((member, idx) => {
            // ✅ 3. 올바른 데이터 경로로 수정
            const name = member.user?.name || '이름 없음';
            // ✅ 4. 팀장의 main_role은 team에서, 팀원은 user에서 가져옵니다.
            const mainRole = (member.role === 'leader' ? team.main_role : member.user?.main_role) || member.role;
            
            let avatar = '👨‍💻'; // 기본값 (개발자)
            if (mainRole.includes('디자인')) avatar = '👩‍🎨';
            else if (mainRole.includes('기획')) avatar = '👨‍💼';
            else if (mainRole.includes('AI')) avatar = '🤖';
            
            return (
              <li key={idx} className="member-item">
                <span className="avatar" title={mainRole}>{avatar}</span>
                <span className="member-name user-hover-trigger"> {/* ✅ 1. 클래스 추가 */}
                  {name}
                  
                  {/* ✅ 2. 숨겨진 호버 카드 추가 (member.user 객체 전달) */}
                  <div className="user-profile-card">
                    <UserProfileCardContent user={member.user} />
                  </div>
                </span>
                <span className="member-role">({mainRole})</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="no-members">아직 팀원이 없습니다.</p>
      )}
    </div>

  </div> // 닫는 div는 하나여야 합니다.
);
              })}
          </>
          </div>
            </>
          )}

{selectedTeam ? (
  <div className="my-team-info">
    <h3>{userType === "leader" ? "내 팀 정보" : "내 팀룸"}</h3>
    <div className="team-detail-box">
      <p><strong>모집 역할군 : </strong> {(selectedTeam.looking_for || []).join(", ")}</p>
      <p><strong>공모전 분야 : </strong> {selectedTeam.category || "미지정"}</p>
      <p>
        <strong>모집 인원 : </strong> {(selectedTeam.members || []).length} / {selectedTeam.max_members}
      </p>
      <p><strong>한 줄 소개 : </strong> {selectedTeam.intro}</p>
    </div>

    <h4>팀원 현황</h4>
    <div className="team-member-list">
      {renderTeamSlots(selectedTeam)}
    </div>

    {/* 리워드 버튼 */}
    {myTeam && (
      <button
        onClick={() => myTeam?.id && handleToggleTeamRoomReward(myTeam.id)}
        className="reward-btn"
        style={{
          backgroundColor: myTeam?.has_reward ? "#facc15" : "#f3d1d1ff",
          color: "black",
          fontWeight: "bold",
          borderRadius: "8px",
          padding: "8px 12px",
          border: "none",
          marginBottom: "10px",
        }}
      >
        {myTeam?.has_reward ? "리워드 사용중 👑" : "리워드 사용하기"}
      </button>
    )}
    <br />

    {/* 팀장 전용 섹션 */}
    {userType === "leader" && (
      <>
        <button
          onClick={handleDeleteTeam}
          className="cta-button danger"
          style={{ marginTop: "20px", backgroundColor: "#e74c3c" }}
        >
          팀 삭제하기
        </button>

        {/* 초대한 사람 목록 */}
        <div className="log-box">
          <h4>📤 초대한 사람 목록</h4>
          {sentInvites.length === 0 ? (
            <p>초대한 사람이 없습니다.</p>
          ) : (
            sentInvites.map((u) => (
              <div key={u.id} className="log-entry">
                <strong className="user-hover-trigger">
                  {u.user?.name || "이름 없음"} 님에게 초대함
                  <div className="user-profile-card">
                    <UserProfileCardContent user={u.user} />
                  </div>
                </strong>
                <button
                  className="sample-button"
                  onClick={() => handleSimulateAcceptInvite(u)}
                  title="이 지원자가 초대를 수락하는 것을 시뮬레이션합니다."
                >
                  (테스트) 수락
                </button>
              </div>
            ))
          )}
        </div>

        {/* 신청자 목록 */}
        <div className="log-box">
          <h4>📥 신청자 목록</h4>
          {receivedApplications.length === 0 ? (
            <p>신청자가 없습니다.</p>
          ) : (
            receivedApplications.map((app) => (
              <div key={app.id} className="log-entry">
                <strong className="user-hover-trigger">
                  {app.user?.name || "이름 없음"} 님의 신청
                  <div className="user-profile-card">
                    <UserProfileCardContent user={app.user} />
                  </div>
                </strong>
                <div className="button-group">
                  <button onClick={() => handleAcceptApplication(app)}>수락</button>
                  <button onClick={() => handleRejectApplication(app)}>거절</button>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    )}
  </div>
) : null}
        </div>

        <div className="right-pane">
          {/* 초기 상태: 팀 미선택 상태에서 PopularStats 표시 */}
          {(userType === "leader" && !selectedTeam) ||
          (userType === "member" && !memberRegistered && !selectedTeam) ? (
            <PopularStats applicants={applicants} />
          ) : null}

          {/* 팀장 시점 + 팀 선택된 경우 → 필터/초대 UI 표시 */}
          {userType === "leader" && selectedTeam && (
            <>
              <div className="filter-bar">
              {/* 역할, 기술 스택 입력창 */}
                <input
                  type="text"
                  placeholder="역할 검색"
                  value={filters.role} // ✅ 새로운 filters state 사용
                  onChange={e => setFilters({ ...filters, role: e.target.value })} // ✅ 새로운 setFilters 함수 사용
                />
              <input
                type="text"
                placeholder="기술 스택 검색"
                value={filters.skill}
                onChange={e => setFilters({ ...filters, skill: e.target.value })}
              />

              {/* 역량 키워드 버튼들 */}
              <div className="keyword-section" style={{ marginTop: '10px' }}>
                {allSkills.map(kw => (
                <button
                  key={kw}
                  type="button"
                  className={`keyword-btn ${filters.keywords.includes(kw) ? "selected" : ""}`}
                  onClick={() => handleKeywordClick(kw)}
                >
                {kw}
                </button>
                  ))}
              </div>

              {/* 평점 슬라이더 */}
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={filters.min_rating}
                  onChange={e => setFilters({ ...filters, min_rating: parseFloat(e.target.value) })}
                />
                <span>최소 평점 ⭐ {filters.min_rating}</span>
              </div>

                
              
              </div>

              <h4>팀을 찾고 있는 사람</h4>
              <div className="list-scroll">
                {filteredApplicants.length > 0 ? (
                  filteredApplicants.map((u) => (
                    <div key={u.id} className="applicant-card">
                      <div>
                        <strong>
                          {u?.user?.username || u?.username || u?.user?.name || u?.name || "이름 없음"}
                          {(u?.user?.has_reward || u?.has_reward) && (
                            <span className="reward-badge" style={{ marginLeft: "8px" }}>👑 리워드 사용중</span>
                          )}
                        </strong>
                      </div>

                      <div className="info-row">
                        <strong>기술 스택 : </strong> {(u.skills || []).join(", ")}
                      </div>
                      <div className="info-row">
                        <strong>희망 역할군 : {u.main_role}</strong>
                      </div>
                      <div className="info-row">
                        <strong>보조 가능 역할군 : {u.sub_role}</strong>
                      </div>
                      <div className="info-row">
                        <strong>보유 역량 : </strong> {(u.keywords || []).join(", ")}
                      </div>
                      <div className="info-row">
                        <strong>한 줄 소개 : {u.intro}</strong>
                      </div>

                      {/* 🔥 여기 고친 부분 */}
                      <div className="info-row">
                        <p>
                          ⭐ {(u?.rating ?? u?.user?.rating ?? 0).toFixed(1)} 참여(
                            {u?.participation ?? u?.user?.participation ?? 0}회)
                        </p>
                      </div>

                      <button className="invite-btn" onClick={() => handleInvite(u)}>
                        초대하기
                      </button>
                      <button
                      className="sample-button" // CSS에 이미 있는 작은 버튼 스타일
                      onClick={() => handleSimulateApply(u)}
                      title="이 지원자가 현재 팀에 지원하는 것을 시뮬레이션합니다."
                    >
                      (테스트) 신청
                    </button>
                    </div>
                  ))
                ) : (
                  <p>현재 팀을 찾고 있는 사용자가 없습니다.</p>
                )}
              </div>
              {toastConfirm && (
                <div className="toast-confirm">
                  <h4 dangerouslySetInnerHTML={{ __html: toastConfirm.title }} />
                  <p dangerouslySetInnerHTML={{ __html: toastConfirm.message }} />
                  <div className="toast-buttons">
                    <button
                      className="cancel"
                      onClick={() => setToastConfirm(null)}
                    >
                      {toastConfirm.cancelText || "취소"}
                    </button>
                    <button
                      className="confirm"
                      onClick={toastConfirm.onConfirm}
                    >
                      {toastConfirm.confirmText || "확인"}
                    </button>
                  </div>
                </div>
              )}

            </>
          )}

          {/* 팀원 시점이고 팀에 이미 참여한 경우 → 공백 */}
          {userType === "member" && memberRegistered && selectedTeam && <></>}

          {userType === "member" && memberRegistered && (
            <div className="my-info">
              <h4>내 정보</h4>
              <p>
                <strong>이름 : {myProfile?.user?.username}</strong>
              </p>
              <p>
                <strong>기술 스택 : {(myProfile.skills || []).join(", ")}</strong>
              </p>
              <p>
                <strong>희망 역할군 : {myProfile.mainRole}</strong>
              </p>
              <p>
                <strong>보조 가능 역할군 : {myProfile.subRole}</strong>
              </p>
              <p>
                <strong>보유 역량 : {myProfile.keywords.join(", ")}</strong>{" "}
              </p>
              <p>
                <strong>한 줄 소개 : {myProfile.intro}</strong>
              </p>

              {/* ✅ 리워드/신청/초대는 팀룸이 아닐 때만 표시 */}
              {!selectedTeam && (
                <>
                  {/* 🔹 개인 리워드 버튼 */}
                  {toastConfirm && (
                    <div className="toast-confirm">
                      <h4 dangerouslySetInnerHTML={{ __html: toastConfirm.title }} />
                      <p dangerouslySetInnerHTML={{ __html: toastConfirm.message }} />
                      <div className="toast-buttons">
                        <button
                          className="cancel"
                          onClick={() => setToastConfirm(null)}
                        >
                          {toastConfirm.cancelText || "취소"}
                        </button>
                        <button className="confirm" onClick={toastConfirm.onConfirm}>
                          {toastConfirm.confirmText || "확인"}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleToggleReward(myProfile?.id || 9999)}
                    className="reward-btn"
                    style={{
                      backgroundColor: myProfile?.has_reward ? "#facc15" : "#f3d1d1ff",
                      color: "black",
                      fontWeight: "bold",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      border: "none",
                      marginBottom: "10px",
                    }}
                  >
                    {myProfile?.has_reward ? "리워드 사용중 👑" : "리워드 사용하기"}
                  </button>

                  {/* 🔸 신청한 팀 */}
                  <div className="log-box">
                    <h4>📤 신청한 팀</h4>
                    {myApplications.length === 0 ? (
                      <p>신청한 팀이 없습니다.</p>
                    ) : (
                      myApplications.map((app) => (
                        <div key={app.id} className="log-entry">
                          <strong className="user-hover-trigger">
                            {app?.team_leader_name || "이름 없음"} 님의 팀에 신청함
                            <div className="user-profile-card">
                              <UserProfileCardContent user={app.team_leader_user} />
                            </div>
                          </strong>
                          <div className="button-group">
                            {app.status === "pending" && (
                              <button
                                className="sample-button"
                                onClick={() => handleSimulateAcceptance(app)}
                                title="팀장이 이 신청을 수락하는 것을 시뮬레이션합니다."

                              >
                                (테스트) 수락
                              </button>
                            )}
                          </div>
                          <span style={{ marginLeft: "8px", color: "#888" }}>
                            {app.status === "pending"
                              ? "⏳ 대기 중"
                              : app.status === "accepted"
                              ? "✅ 승인됨"
                              : "❌ 거절됨"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 🔸 받은 초대 */}
                  <div className="log-box">
                    <h4>📥 받은 초대</h4>
                    {invitations.length === 0 ? (
                      <p>받은 초대가 없습니다.</p>
                    ) : (
                      invitations.map((t) => (
                        <div key={t.id} className="log-entry">
                          <strong className="user-hover-trigger">
                          {(t.team?.leader_name || t.leader_name || t.leader?.name || t.team_leader_name || t?.team_leader_name || "알 수 없음")} 님의 초대
                                <div className="user-profile-card">
                              <UserProfileCardContent  user={
                              t.leader?.user ||     // leader.user가 있을 때 (리더 필드가 객체인 경우)
                              t.leader ||           // leader 자체가 user 객체일 때
                              t.team?.leader ||     // team 안에 leader 필드 있을 때
                              t.team?.user ||       // team 안에 user 필드 있을 때
                              t.user ||             // 그냥 user 필드가 있을 때
                              null                  // 아무것도 없으면 null (빈칸 방지)
                            } />
                            </div>
                          </strong>
                          <div className="button-group">
                            <button onClick={() => handleAcceptInvite(t.id)}>
                              수락
                            </button>
                            <button onClick={() => handleRejectInvite(t.id)}>
                              거절
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* 🔸 팀원 등록 해제 / 팀에서 나가기 버튼 */}
              <button
                onClick={handleDeregisterMember}
                className="cta-button danger"
                style={{ marginTop: "20px", backgroundColor: "#e74c3c" }}
              >
                {selectedTeam ? "팀에서 나가기" : "팀원 등록 해제"}
              </button>
            </div>
          )}

          
        </div>
      </div>
      {showDeleteConfirm && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h4 style={{ marginTop: 0, fontSize: '1.25rem', color: '#222' }}>
              팀 삭제
            </h4>
            <p style={{ color: '#444', fontSize: '1rem', lineHeight: 1.6, margin: '20px 0' }}>
              정말로 팀을 삭제하시겠습니까?
              <br/>
              <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="toast-buttons" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button
                className="cancel"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ 
                  backgroundColor: '#aaa', 
                  minWidth: '100px', 
                  padding: '10px',
                  fontSize: '1rem' 
                }}
              >
                취소
              </button>
              <button
                className="confirm"
                onClick={onConfirmDelete}
                style={{ 
                  backgroundColor: '#e74c3c', // 삭제 버튼은 빨간색
                  minWidth: '100px',
                  padding: '10px',
                  fontSize: '1rem' 
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeregisterConfirm && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h4 style={{ marginTop: 0, fontSize: '1.25rem', color: '#222' }}>
            {selectedTeam ? "팀에서 나가기" : "팀원 등록 해제"}
          </h4>
          <p
            style={{
              color: '#444',
              fontSize: '1rem',
              lineHeight: 1.6,
              margin: '20px 0',
            }}
          >
            {selectedTeam
              ? "정말로 이 팀에서 나가시겠습니까?"
              : "정말로 대기열 등록을 해제하시겠습니까?"}
            <br />
            <span style={{ fontWeight: 'bold' }}>
              {selectedTeam
                ? "팀을 나가면 다시 합류하려면 초대를 받아야 합니다."
                : "작성한 프로필 정보가 모두 삭제됩니다."}
            </span>
          </p>
            <div className="toast-buttons" style={{ justifyContent: 'center', gap: '1rem' }}>
              <button
                className="cancel"
                onClick={() => setShowDeregisterConfirm(false)}
                style={{ 
                  backgroundColor: '#aaa', 
                  minWidth: '100px', 
                  padding: '10px',
                  fontSize: '1rem' 
                }}
              >
                취소
              </button>
            <button
              className="confirm"
              onClick={onConfirmDeregister} // ✅ 기존 함수 그대로 사용
              style={{
                backgroundColor: '#e74c3c',
                minWidth: '100px',
                padding: '10px',
                fontSize: '1rem',
              }}
            >
              {selectedTeam ? "나가기" : "등록 해제"}
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
    
  );

  
}

export default TeamMatching2;