from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser
from django.utils import timezone

# ============================
# 🧩 Models
# ============================
from .models import (
    User,
    WaitingPool as UserProfile,
    TeamRoom as Team,       # ✅ 원본 이름 그대로 유지 (별칭 불필요)
    TeamMember,
    Application,
    Invitation,
    
)

# ============================
# 🧩 Serializers
# ============================
from .serializers import (
    UserSerializer,
    TeamRoomSerializer,
    ApplicationSerializer,
    InviteSerializer,
    WaitingPoolListSerializer,
)

def get_dummy_user_profile():
    """
    ✅ DB에 *반드시 존재해야 하는* 더미 유저(User.id=9999)를 가져옵니다.
       waiting_pool(UserProfile)과 FK로 연결.
    """
    try:
        # ✅ 1️⃣ 더미 유저 가져오기 (get_or_create -> get)
        dummy_user = User.objects.get(id=9999)
        # print(f"[DEBUG] ✅ dummy_user.id={dummy_user.id} 찾음")

        # ✅ 2️⃣ WaitingPool(FK user) 연결 (get_or_create 유지)
        user_profile, created = UserProfile.objects.get_or_create(
            user=dummy_user,
            defaults={
                "skills": [],
                "keywords": [],
                "main_role": dummy_user.main_role or "미지정",
                "sub_role": dummy_user.sub_role or "미지정",
            },
        )
        # print(f"[DEBUG] ✅ UserProfile 연결됨 (user_id={dummy_user.id}, created={created})")
        return user_profile

    except User.DoesNotExist:
        print(f"[ERROR] ❌ 심각: DB에 9999번 더미 유저가 없습니다! SQL 파일을 확인하세요.")
        return None
    except Exception as e:
        print(f"[ERROR] ❌ get_dummy_user_profile 실패: {e}")
        return None

    

#내부 유틸
def _member_count(team: Team) -> int:
    return team.members.count()

def _is_leader(team: Team, user_profile: UserProfile) -> bool:
    return team.leader_id == user_profile.id

def _already_member(team: Team, user_profile: UserProfile) -> bool:
    return team.members.filter(id=user_profile.id).exists()

def _team_is_full(team: Team) -> bool:
    return _member_count(team) >= int(team.max_members or 0)



# =====================================================================
# [1] 팀 목록 조회 (TeamListView)
# =====================================================================
class TeamListView(APIView):
    """[1] 팀룸 리스트 조회 + 리워드 포함"""
    def get(self, request):
        # ✅ 정렬 순서 추가: 리더의 has_reward 내림차순 -> 최신 생성 순
        teams = Team.objects.select_related('user').order_by('-user__has_reward', '-created_at')
        serializer = TeamRoomSerializer(teams, many=True)

        # ⚠️ 참고: 이 부분은 현재 리더의 has_reward를 가져와 덮어쓰고 있습니다.
        #   만약 팀 자체의 has_reward를 보여주고 싶다면 이 로직을 제거해야 합니다.
        for team_data in serializer.data:
            leader_id = team_data.get("user") or team_data.get("user_id")
            user = User.objects.filter(id=leader_id).first()
            # ✅ TeamRoom 모델 자체에 has_reward 필드가 있으므로, 
            #    아래 덮어쓰는 로직 대신 해당 필드를 serializer에 포함하는 것이 더 좋습니다.
            #    (현재 로직은 리더의 리워드 상태를 팀 리워드처럼 보여줍니다)
            team_data["has_reward"] = bool(user and getattr(user, "has_reward", False))

        return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================================
# [2] 팀 생성 (TeamCreateView)
# =====================================================================
class TeamCreateView(APIView):
    """[2] 팀룸 생성"""
    def post(self, request):
        print("\n[TeamCreateView] 팀 생성 요청 도착 ✅")
        data = request.data.copy()
        print("[요청 데이터]", data)

        user_id_raw = data.get("user_id") or data.get("user")
        try:
            user_id = int(user_id_raw)
        except (TypeError, ValueError):
            print("[ERROR] user_id 변환 실패:", user_id_raw)
            return Response({"error": "user_id가 유효하지 않습니다."}, status=status.HTTP_400_BAD_REQUEST)

        user_obj, created = User.objects.get_or_create(
            id=user_id,
            defaults={
                "name": data.get("leader_name", "더미유저"),
                "main_role": data.get("main_role", ""),
                "skills": [],
                "keywords": [],
                "rating": 0.0,
                "participation": 0,
                "has_reward": False,
            }
        )

        if created:
            print(f"[INFO] 더미 유저 생성됨 → id={user_obj.id}, name={user_obj.name}")
        else:
            print(f"[INFO] 기존 유저 사용 → id={user_obj.id}, name={user_obj.name}")

        # ✅ context로 user를 넘겨줌 (핵심!)
        serializer = TeamRoomSerializer(data=data, context={'user': user_obj})
        if serializer.is_valid():
            team = serializer.save()  # context에서 user를 자동으로 가져감
            print(f"[SUCCESS] 팀 생성 완료! team_id={team.id}, user_id={user_obj.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        print("[VALIDATION ERROR]", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =====================================================================
# [3] 팀 상세조회 (TeamDetailView)
# =====================================================================
class TeamDetailView(APIView):
    """[3] 특정 팀룸 상세조회"""
    def get(self, request, team_id):
        team = get_object_or_404(Team, id=team_id)
        serializer = TeamRoomSerializer(team)
        return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================================
# [4] 팀 참가 신청 (TeamApplyView) - (최종 수정본)
# =====================================================================
class TeamApplyView(APIView):
    """[4] 팀룸에 참가 신청 (수정본)"""
    def post(self, request, team_id):
        user_val = request.data.get("user") or request.data.get("user_id")
        
        if not user_val:
            return Response({"message": "유저 정보가 없습니다."}, status=400)

        if Application.objects.filter(
            user_id=user_val, 
            team_id=team_id
        ).exclude(status='rejected').exists():
            return Response({"message": "이미 신청했거나 승인된 팀입니다."}, status=400)

        data = {
            "user_id": user_val, 
            "team_id": team_id,
        }

        serializer = ApplicationSerializer(data=data)
        if serializer.is_valid():
            # ✅ 1. 생성된 객체를 'application' 변수에 저장합니다.
            application = serializer.save() 

            # ✅ 2. 'application' 객체를 다시 직렬화하여 "진짜" 데이터를 반환합니다.
            #    (이제 id, status, user 상세 정보가 포함됩니다)
            response_data = ApplicationSerializer(application).data

            print(f"[INFO] ✅ Application created: user={user_val}, team={team_id}")
            return Response(
                {"message": "신청 완료", "data": response_data}, # 👈 'serializer.data' -> 'response_data'
                status=201
            )

        print(f"[ERROR] ❌ Validation failed: {serializer.errors}")
        return Response(serializer.errors, status=400)
    
# =====================================================================
# [5] 신청 승인 (AcceptApplicationView) - (최종 수정본)
# =====================================================================
class AcceptApplicationView(APIView):
    """[5] 리더가 신청 승인 (수정본)"""
    def post(self, request, team_id):
        application_id = request.data.get("application_id")
        application = get_object_or_404(Application, id=application_id, team_id=team_id)

        with transaction.atomic():
            # 1. 신청서 상태 변경
            application.status = "accepted"
            application.save()
            
            # 2. 팀 멤버로 추가
            TeamMember.objects.create(
                team_id=team_id, user_id=application.user_id, role="member", status="active"
            )
            
            # ✅ 3. (버그 1 해결) WaitingPool 프로필 정보를 User 모델로 복사/동기화
            try:
                # UserProfile은 WaitingPool의 별칭임
                profile = UserProfile.objects.filter(user__id=application.user_id).first()
                user = profile.user
                
                # WaitingPool의 정보를 User 테이블로 덮어쓰기
                user.skills = profile.skills
                user.main_role = profile.main_role
                user.sub_role = profile.sub_role
                user.keywords = profile.keywords
                # user.intro = profile.intro  # User 모델에 intro가 있다면 이것도 추가
                user.save()
                
                # ✅ 4. (버그 2 연동) WaitingPool에서 해당 유저 삭제
                profile.delete()
                
            except UserProfile.DoesNotExist:
                # WaitingPool에 프로필이 없으면 (일반 유저가 신청) 그냥 통과
                pass

        return Response({"message": "신청 승인 완료"}, status=200)


# =====================================================================
# [6] 신청 거절 (RejectApplicationView)
# =====================================================================
class RejectApplicationView(APIView):
    """[6] 리더가 신청 거절"""
    def post(self, request, application_id):
        application = get_object_or_404(Application, id=application_id)
        application.status = "rejected"
        application.save()
        return Response({"message": "신청 거절 완료"}, status=200)


# =====================================================================
# [7] 내 신청 목록 (MyApplicationsView) - (최종 수정본)
# =====================================================================
class MyApplicationsView(APIView):
    """특정 유저가 신청한 팀 목록 조회 (팀장 정보 포함)"""
    def get(self, request, user_id):
        # ✅ 1. select_related로 팀(team)과 팀의 유저(team__user) 정보까지 한 번에 가져옵니다.
        apps = Application.objects.filter(user_id=user_id).select_related("team", "team__user")
        
        data = []
        for a in apps:
            team = a.team
            leader = team.user # ✅ 2. 팀의 리더(user) 객체를 가져옵니다.
            
            data.append({
                "id": a.id,
                "team": team.id,
                "team_leader_name": team.leader_name,
                "team_category": team.category,
                "team_intro": team.intro,
                "status": a.status,
                
                # ✅ 3. (핵심) 리더의 상세 정보를 'team_leader_user' 키에 담아 보냅니다.
                "team_leader_user": {
                    "id": leader.id,
                    "name": leader.name,
                    "main_role": leader.main_role,
                    "sub_role": leader.sub_role,
                    "intro": leader.intro,
                    "skills": leader.skills,
                    "keywords": leader.keywords,
                    "rating": leader.rating,
                    "participation": leader.participation,
                    "has_reward": leader.has_reward,
                }
            })
        
        return Response(data, status=status.HTTP_200_OK)


# =====================================================================
# [8] 초대 보내기 (InviteUserView) - (최종 수정본)
# =====================================================================
class InviteUserView(APIView):
    """[5] 팀원 초대 (수정본)"""
    def post(self, request, team_id):
        user_id = request.data.get("user_id")

        if not user_id:
            return Response({"message": "user_id가 필요합니다."}, status=400)
        if Invitation.objects.filter(team_id=team_id, user_id=user_id).exists():
            return Response({"message": "이미 초대한 사용자입니다."}, status=400)

        data = {
            "team_id": team_id,   # ✅ 'team' -> 'team_id'로 수정 (KeyError 해결)
            "user_id": user_id, 
        }

        serializer = InviteSerializer(data=data)
        if serializer.is_valid():
            # ✅ 1. 생성된 객체를 'invitation' 변수에 저장합니다.
            invitation = serializer.save()

            # ✅ 2. 'invitation' 객체를 다시 직렬화하여 "진짜" 데이터를 반환합니다.
            response_data = InviteSerializer(invitation).data

            print(f"[INFO] ✅ 팀 {team_id} → 유저 {user_id} 초대 완료")
            return Response(
                {
                    "message": "초대가 완료되었습니다.",
                    "data": response_data # 👈 'serializer.data' -> 'response_data'
                },
                status=201
            )

        print(f"[ERROR] 초대 실패: {serializer.errors}")
        return Response(serializer.errors, status=400)


# =====================================================================
# [9] 초대 수락 (AcceptInviteView)
# =====================================================================
class AcceptInviteView(APIView):
    def post(self, request, invite_id):
        try:
            invitation = get_object_or_404(Invitation, id=invite_id)

            if invitation.status == "accepted":
                return Response({"message": "이미 처리된 초대"}, status=400)

            # ✅ 초대 수락 처리
            invitation.status = "accepted"
            invitation.save()

            team = invitation.team
            user = invitation.user

            # ✅ 팀에 멤버 등록
            TeamMember.objects.create(team=team, user=user, role="member", status="active")

            # ✅ 중복 신청/초대 정리
            Invitation.objects.filter(user=user, team=team).delete()
            Application.objects.filter(user=user, team=team).delete()

            # ✅ “내 팀 정보” 응답 (프론트가 바로 전환할 수 있게)
            team_data = TeamRoomSerializer(team).data

            return Response(
                {
                    "message": "초대를 수락했습니다.",
                    "team": team_data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            print("❌ 초대 수락 중 오류:", e)
            return Response(
                {"message": "초대 수락 중 오류가 발생했습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )



# =====================================================================
# [10] 초대 거절 (RejectInviteView)
# =====================================================================
class RejectInviteView(APIView):
    """[10] 유저가 초대 거절"""
    def post(self, request, invite_id):
        invite = get_object_or_404(Invitation, id=invite_id)
        invite.status = "rejected"
        invite.save()
        return Response({"message": "초대 거절 완료"}, status=200)


# =====================================================================
# [11] 내 초대 목록 (MyInvitesView) - (최종 수정본)
# =====================================================================
class MyInvitesView(APIView):
    def get(self, request, user_id):
        invites = Invitation.objects.filter(
            Q(user_id=user_id),
            Q(status='pending') | Q(status__isnull=True)
        ).select_related('team', 'user')
        serializer = InviteSerializer(invites, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================================
# 대기열 목록
# =====================================================================
class WaitingListView(APIView):
    """팀매칭2: 대기열 목록"""
    def get(self, request):
        qs = UserProfile.objects.select_related("user").order_by("-joined_at")
        data = WaitingPoolListSerializer(qs, many=True).data
        return Response(data, status=200)
    

# =====================================================================
# [12] 지원자 필터 (ApplicantFilterView)
# =====================================================================
class ApplicantFilterView(APIView):
    """
    [12] 다양한 조건 기반 유저 검색 필터
    """
    def get(self, request):
        qs = UserProfile.objects.select_related("user").order_by('-user__has_reward', '-joined_at')

        # 필터 파라미터 읽기
        main_role = request.query_params.get("main_role")
        skill = request.query_params.get("skills")
        min_rating = request.query_params.get("rating")
        keywords = request.query_params.getlist("keyword")
        leader_id = request.query_params.get("leader_id")

        # --- 필터링 조건 ---
        if main_role:
            qs = qs.filter(Q(main_role__icontains=main_role) | Q(sub_role__icontains=main_role))
        if skill:
            qs = qs.filter(skills__icontains=skill)
        if keywords:
            for kw in keywords:
                qs = qs.filter(keywords__icontains=kw)
        if min_rating:
            try:
                qs = qs.filter(user__rating__gte=float(min_rating))  # ✅ users.rating 기준
            except (ValueError, TypeError):
                pass
        if leader_id:
            qs = qs.exclude(user__id=leader_id)

        serializer = WaitingPoolListSerializer(qs.distinct(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ----------------------------------------------------------
#  [13] 유저 프로필 생성 / 수정 / 삭제
# ----------------------------------------------------------
class UserProfileUpdateView(APIView):
    """waiting_pool 기반 유저 프로필 생성 / 수정 / 삭제"""

    @transaction.atomic
    def post(self, request):
        """대기열에 등록하거나 기존 데이터 갱신"""
        dummy_profile = get_dummy_user_profile()
        if not dummy_profile:
            return Response({"error": "더미 유저 생성 실패"}, status=500)

        data = request.data or {}
        print("[DEBUG] POST /profile/update:", data)

        # 문자열 → 리스트 변환
        def to_list(v):
            if isinstance(v, str):
                return [x.strip() for x in v.split(",") if x.strip()]
            return v or []

        # ✅ waiting_pool에 upsert

        UserProfile.objects.update_or_create(
            user=dummy_profile.user,
            defaults={
                "skills": to_list(data.get("skills")),
                "keywords": to_list(data.get("keywords")),
                "main_role": data.get("main_role", ""),
                "sub_role": data.get("sub_role", ""),
                "joined_at": timezone.now(),
            },
        )

        print(f"[INFO] ✅ 대기열 등록/갱신 완료 (user_id={dummy_profile.user.id})")
        return Response({"message": "대기열 등록 완료"}, status=200)

    @transaction.atomic
    def delete(self, request):
        """대기열에서 유저 제거 + 관련 데이터 정리"""
        try:
            dummy_user = User.objects.get(id=9999)

            # ✅ 1️⃣ waiting_pool 삭제
            deleted_waiting, _ = UserProfile.objects.filter(user_id=dummy_user.id).delete()

            # ✅ 2️⃣ 신청(application) 기록 삭제
            deleted_apps, _ = Application.objects.filter(user_id=dummy_user.id).delete()

            # ✅ 3️⃣ 초대(invitations) 기록 삭제
            deleted_invites, _ = Invitation.objects.filter(user_id=dummy_user.id).delete()

            # ✅ 4️⃣ 팀 멤버 기록도 삭제 (있다면)
            deleted_team_members, _ = TeamMember.objects.filter(user_id=dummy_user.id).delete()

            print(
                f"[INFO] ❌ 대기열 및 관련 데이터 삭제 완료 "
                f"(user_id={dummy_user.id}, waiting={deleted_waiting}, "
                f"apps={deleted_apps}, invites={deleted_invites}, team_members={deleted_team_members})"
            )

            return Response({"message": "팀원 등록을 해제하였습니다."}, status=200)

        except User.DoesNotExist:
            return Response({"error": "유저를 찾을 수 없습니다."}, status=404)

        except Exception as e:
            print(f"[ERROR] ❌ 대기열 삭제 실패: {e}")
            return Response({"error": str(e)}, status=500)
        

# [14] 팀 삭제
class TeamDeleteView(APIView):
    def delete(self, request, pk):
        try:
            team = Team.objects.get(pk=pk)
            team.delete()
            return Response(
                {"message": "팀이 삭제되었습니다."},
                status=status.HTTP_200_OK  # ✅ 204 → 200으로 변경
            )
        except Team.DoesNotExist:
            return Response(
                {"error": "해당 팀이 존재하지 않습니다."},
                status=status.HTTP_404_NOT_FOUND
            )
        

# =====================================================================
# 개인 리워드 팀을 찾는 인원용
# =====================================================================
class RewardToggleView(APIView):
    """리워드 상태 토글 API"""
    def post(self, request, user_id):
        print(f"[DEBUG] RewardToggleView called for user {user_id}")
        user = get_object_or_404(User, id=user_id)

        # ✅ 정확한 필드명으로 변경
        user.has_reward = not user.has_reward
        user.save()

        print(f"[DEBUG] Reward toggled → {user.has_reward}")
        return Response(
            {"message": "리워드 상태 변경 완료", "has_reward": user.has_reward},
            status=status.HTTP_200_OK
        )
    
class TeamRoomRewardToggleView(APIView):
    """팀 리워드 on/off 토글"""

    def post(self, request, team_id):
        team = get_object_or_404(Team, id=team_id)
        team.has_reward = not team.has_reward
        team.save(update_fields=["has_reward"])
        team.refresh_from_db()  # ✅ 이거 추가 (캐시 무효화)

        serializer = TeamRoomSerializer(team)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GetTeamByMember(APIView):
    def get(self, request, user_id):
        team_member = TeamMember.objects.filter(
            user_id=user_id, status='active'
        ).select_related('team').first()

        if not team_member:
            return Response({'message': '소속된 팀이 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TeamRoomSerializer(team_member.team)
        return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================================
# 팀 탈퇴 (TeamLeaveView)  없어도 될거같은데 일단 놔둠
# =====================================================================
class TeamLeaveView(APIView):
    """
    [14] 팀 탈퇴: 팀에 소속된 사용자가 자발적으로 팀을 떠남.
    - URL: /teams/<team_id>/leave/  (POST)
    - 요청 body: { "user_id": <int> }
    - 동작:
        * 해당 팀의 TeamUser 레코드가 삭제(or status='left' 처리)
        * 만약 탈퇴자가 리더이면 기본 정책: 리더는 직접 탈퇴 불가(에러 반환)
          (추가: 리더 이전 로직이나 팀 해산 로직 필요 시 확장)
    """
    def post(self, request, team_id):
        user_id = request.data.get("user_id")
        team = get_object_or_404(Team, id=team_id)

        # 간단 리더 체크: team.user_id 는 팀룸 생성자(리더)의 user id
        if str(team.user_id) == str(user_id) or getattr(team.user, "id", None) == int(user_id):
            return Response({"message": "리더는 직접 탈퇴할 수 없습니다. 팀 해산 또는 리더 이전을 수행하세요."},
                            status=403)

        tu = TeamMember.objects.filter(team_id=team_id, user_id=user_id).first()
        if not tu:
            return Response({"message": "해당 사용자는 이 팀의 소속이 아닙니다."}, status=404)

        # 삭제 대신 상태를 변경하고 싶으면 아래처럼 변경 가능:
        # tu.status = 'left'
        # tu.save()
        tu.delete()
        return Response({"message": "팀 탈퇴 완료"}, status=200)


