import random
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import User, Team, TeamMember, WaitingUser, Feedback, TeamAvoid

# 팀 정원
TEAM_SIZE = 4

@csrf_exempt
@api_view(['POST'])
def save_user_input(request):
    d = request.data
    user_id = str(d.get("userId", "")).strip()
    if not user_id:
        return Response({"message": "userId가 필요합니다."}, status=400)\
        
    try:
        existing_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        existing_user = None

    # ✅ 기존 name을 유지하고, 새 name이 주어졌을 때만 업데이트
    new_name = d.get("name")
    if not new_name or new_name.strip() == "":
        name_value = existing_user.name if existing_user else "이름없음"
    else:
        name_value = new_name.strip()

    # ✅ rating/participation 기존 값 유지
    rating_value = (
        d.get("rating")
        if d.get("rating") is not None
        else (existing_user.rating if existing_user else 0)
    )
    participation_value = (
        d.get("participation")
        if d.get("participation") is not None
        else (existing_user.participation if existing_user else 0)
    )

    has_reward_value = bool(d.get("hasReward", False))


    # ✅ User 테이블에는 기본 정보만 저장
    User.objects.update_or_create(
        id=user_id,
        defaults={
            "name": name_value,
            "main_role": (
                d.get("mainRole").strip()
                if d.get("mainRole") and d.get("mainRole").strip() != ""
                else (existing_user.main_role if existing_user else "unknown")
            ),
            "sub_role": (
                d.get("subRole").strip()
                if d.get("subRole") and d.get("subRole").strip() != ""
                else (existing_user.sub_role if existing_user else None)
            ),
            "keywords": (
                d.get("keywords")
                if d.get("keywords")
                else (existing_user.keywords if existing_user else [])
            ),
            "skills": (
                d.get("skills")
                if d.get("skills")
                else (existing_user.skills if existing_user else [])
            ),
            "rating": rating_value,
            "participation": participation_value,
            "has_reward": has_reward_value, 
        },
    )

    # ✅ WaitingUser 테이블에는 매칭용 데이터 저장
    WaitingUser.objects.update_or_create(
        user_id=user_id,
        defaults={
            "skills": (
                d.get("skills")
                if d.get("skills")
                else (existing_user.skills if existing_user else [])
            ),
            "main_role": (
                d.get("mainRole").strip()
                if d.get("mainRole") and d.get("mainRole").strip() != ""
                else (existing_user.main_role if existing_user else "unknown")
            ),
            "sub_role": (
                d.get("subRole").strip()
                if d.get("subRole") and d.get("subRole").strip() != ""
                else (existing_user.sub_role if existing_user else None)
            ),
            "keywords": (
                d.get("keywords")
                if d.get("keywords")
                else (existing_user.keywords if existing_user else [])
            ),
            "has_reward": bool(d.get("hasReward", False)),
        },
    )
    WaitingUser.objects.filter(user_id=user_id).update(has_reward=has_reward_value)
    return Response({"message": f"user {user_id} 저장 완료"}, status=200)



@csrf_exempt
@api_view(['POST'])
def apply_teamup(request):
    print("🔥 [views.py] apply_teamup 요청 도착!", request.method)
    print("📦 [RAW BODY]:", request.body)
    print("📦 [DATA PARSED]:", request.data)

    raw = request.data.get("userId")
    if raw is None:
        return Response({"message": "userId가 필요합니다.", "debug": request.data}, status=400)

    try:
        user_pk = int(str(raw).strip())
    except ValueError:
        return Response({"message": "userId는 정수여야 합니다.", "debug": raw}, status=400)
    
    print(f"✅ userId 정상 파싱됨: {user_pk}")

    # 이미 팀에 소속된 경우 예외 처리
    if TeamMember.objects.filter(user_id=user_pk).exists():
        return Response({"message": "이미 팀에 속한 유저입니다."}, status=400)

    # 현재 DB에 존재하는 유저인지 확인
    try:
        applicant = User.objects.get(id=user_pk)
    except User.DoesNotExist:
        return Response({"message": "해당 유저를 찾을 수 없습니다."}, status=404)

    # 현재 보유한 리워드 여부 확인
    has_reward = getattr(applicant, "has_reward", False)

    # 아직 팀에 소속되지 않은 유저 불러오기
    available_users = list(User.objects.exclude(
        id__in=TeamMember.objects.values_list("user_id", flat=True)
    ))

    # 신청자는 반드시 포함되도록 맨 앞으로 이동
    import random
    random.shuffle(available_users)
    available_users.sort(key=lambda u: (u.id != user_pk))

    with transaction.atomic():
        created_team_ids = []
        matched_user_ids = []

        from .models import TeamAvoid

        avoid_pairs = TeamAvoid.objects.all()
        avoid_dict = {}
        for pair in avoid_pairs:
            avoid_dict.setdefault(pair.user_a, set()).add(pair.user_b)

        TEAM_SIZE = 4
        used_users = set()

        # ✅ 리워드 유저가 있을 경우 해당 유저를 중심으로 팀 구성
        if has_reward:
            print("🎁 리워드 보유자 우선 매칭 모드")
            new_team = Team.objects.create(status="pending")

            # 신청자 포함
            TeamMember.objects.create(team=new_team, user_id=applicant.id)
            matched_user_ids.append(applicant.id)
            used_users.add(applicant.id)

            # 신청자 제외한 나머지에서 회피 관계 고려하여 3명 선택
            candidates = [u for u in available_users if u.id != applicant.id]
            selected = []
            for u in candidates:
                if any(u.id in avoid_dict.get(sel.id, set()) or u.id in avoid_dict.get(applicant.id, set()) for sel in selected):
                    continue
                selected.append(u)
                if len(selected) == TEAM_SIZE - 1:
                    break

            if len(selected) < TEAM_SIZE - 1:
                return Response({"message": "리워드 우선매칭 실패: 인원이 부족합니다."}, status=400)

            for u in selected:
                TeamMember.objects.create(team=new_team, user_id=u.id)
                matched_user_ids.append(u.id)
                used_users.add(u.id)

            created_team_ids.append(new_team.id)

            # 리워드 사용 처리
            applicant.has_reward = False
            applicant.save()

        else:
            # 일반 매칭 로직
            print("🧩 일반 랜덤 매칭 모드")
            while len(available_users) >= TEAM_SIZE:
                selected_users = []
                for u in available_users:
                    if any(u.id in avoid_dict.get(sel.id, set()) for sel in selected_users):
                        continue
                    selected_users.append(u)
                    if len(selected_users) == TEAM_SIZE:
                        break

                if len(selected_users) < TEAM_SIZE:
                    break

                new_team = Team.objects.create(status="pending")

                for u in selected_users:
                    TeamMember.objects.create(team=new_team, user_id=u.id)
                    matched_user_ids.append(u.id)
                    used_users.add(u.id)

                created_team_ids.append(new_team.id)
                available_users = [u for u in available_users if u.id not in used_users]

        # 매칭 완료 후 대기열 정리
        if matched_user_ids:
            WaitingUser.objects.filter(user_id__in=matched_user_ids).delete()

        # 남은 인원 대기열로 이동
        for u in available_users:
            WaitingUser.objects.update_or_create(
                user_id=u.id,
                defaults={
                    "skills": [],
                    "main_role": u.main_role,
                    "sub_role": u.sub_role,
                    "keywords": u.keywords,
                    "has_reward": getattr(u, "has_reward", False),
                }
            )

    # ✅ 응답 데이터 구성
    teams_data = []
    for tid in created_team_ids:
        team = Team.objects.get(id=tid)
        members = []
        for tm in TeamMember.objects.filter(team=team):
            try:
                u = User.objects.get(id=tm.user_id)
                waiting_info = WaitingUser.objects.filter(user_id=u.id).first()
                members.append({
                    "id": u.id,
                    "name": u.name,
                    "mainRole": waiting_info.main_role if waiting_info and waiting_info.main_role else u.main_role,
                    "subRole": waiting_info.sub_role if waiting_info and waiting_info.sub_role else u.sub_role,
                    "keywords": waiting_info.keywords if waiting_info and waiting_info.keywords else u.keywords,
                    "skills": waiting_info.skills if waiting_info else [],
                    "rating": u.rating,
                    "participation": u.participation,
                })
            except User.DoesNotExist:
                members.append({"id": tm.user_id, "name": "알 수 없음"})
        teams_data.append({
            "teamId": team.id,
            "members": members,
            "status": team.status,
        })

    # ✅ 최종 응답
    if has_reward:
        return Response({
            "message": "🎖️ 리워드 우선매칭 성공!",
            "teams": teams_data
        }, status=201)
    elif teams_data:
        return Response({
            "message": "팀 매칭 성공!",
            "teams": teams_data
        }, status=201)
    else:
        return Response({"message": "인원이 부족합니다. 대기열에 등록되었습니다."}, status=200)

    

@csrf_exempt
@api_view(['GET'])
def get_matched_teams(request):
    print("🔥 [Django] feedback 요청 도착!")
    print("📦 request.data:", request.data)
    teams = Team.objects.prefetch_related('teammember_set').all()
    result = []

    for t in teams:
        members = []
        for tm in t.teammember_set.all():
            try:
                u = User.objects.get(id=tm.user_id)
                w = WaitingUser.objects.filter(user_id=tm.user_id).first()

                members.append({
                    "id": u.id,
                    "name": u.name,
                    "mainRole": w.main_role if w else u.main_role,
                    "subRole": w.sub_role if w else u.sub_role,
                    "skills": (w.skills if w else []),
                    "keywords": (w.keywords if w else u.keywords),
                    "rating": u.rating,
                    "participation": u.participation,
                })
            except User.DoesNotExist:
                members.append({
                    "id": tm.user_id,
                    "name": f"User {tm.user_id}",
                })
        result.append({
            "teamId": t.id,
            "members": members,
            "status": "confirmed" if t.is_finalized else "pending",
        })

    return Response(result, status=200)

@csrf_exempt
@api_view(['POST'])
def submit_feedback(request):
    print("🔥 [submit_feedback] 요청 도착:", request.method)
    print("📦 [submit_feedback] DATA:", request.data)

    data = request.data
    team_id = data.get("team_id") or data.get("teamId")
    user_id = data.get("user_id") or data.get("userId")
    agree = data.get("agree")

    agree = str(agree).lower() in ("true", "1", "yes", "y")

    # ✅ 필수값 검증
    if not team_id or not user_id:
        return Response({"message": "team_id, user_id가 필요합니다."}, status=400)

    try:
        team_id = int(team_id)
        user_pk = int(user_id)
    except ValueError:
        return Response({"message": "team_id, user_id는 정수여야 합니다."}, status=400)

    # ✅ 피드백 저장 (단순 저장만)
    Feedback.objects.update_or_create(
        team_id=team_id,
        user_id=user_pk,
        defaults={"agree": agree},
    )

    members_qs = TeamMember.objects.filter(team_id=team_id)
    cnt_members = members_qs.count()
    fbs = list(Feedback.objects.filter(team_id=team_id))

    # 아직 모두 완료 안됨 → 단순 저장
    if len(fbs) < cnt_members:
        return Response({"message": "피드백 저장 완료"}, status=201)

    # 모두 동의 → 팀 확정
    if all(f.agree for f in fbs):
        Team.objects.filter(id=team_id).update(is_finalized=True)
        return Response({"message": "모두 동의. 팀 확정 완료."}, status=200)

    # ✅ (수정됨) 여기서는 아무것도 이동시키지 않음.
    # 단순히 "피드백 모두 완료됨"만 알려줌
    disagree_ids = [f.user_id for f in fbs if not f.agree]
    return Response({
        "message": f"피드백 완료. 비동의 {len(disagree_ids)}명 있음.",
        "teamId": team_id,
        "disagreed_users": disagree_ids,
    }, status=200)


@csrf_exempt
@api_view(['GET'])
def get_waiting_users(request):
    """
    WaitingUser 테이블의 현재 사용자 목록을 반환
    - 초기에는 이명준(99) 제외 50명 생성
    - 이후에는 그대로 유지 (제한 없음)
    - 이명준이 있으면 유지, 없으면 제외
    """
    import random

    # ✅ 현재 WaitingUser 불러오기 (99 제외)
    waiting_users = list(WaitingUser.objects.exclude(user_id=99))

    # ✅ 초기 시드 생성 (대기열이 비어 있을 때만)
    if not waiting_users:
        users = list(
            User.objects.exclude(id=99)
                        .exclude(name__isnull=True)
                        .exclude(name__exact="")
                        .exclude(name__icontains="undefined")
        )

        if not users:
            return Response({"waiting_users": []})

        random_users = random.sample(users, min(50, len(users)))
        waiting_instances = [
            WaitingUser(
                user_id=u.id,
                main_role=u.main_role,
                sub_role=u.sub_role,
                skills=u.skills,
                keywords=u.keywords,
                has_reward=False,   
            )
            for u in random_users
        ]
        WaitingUser.objects.bulk_create(waiting_instances)
        waiting_users = WaitingUser.objects.exclude(user_id=99)

        # ✅ 이 시점에만 순서 랜덤화
        random.shuffle(waiting_users)

    # ✅ 응답 데이터 구성
    data = []
    for w in waiting_users:
        try:
            u = User.objects.get(id=w.user_id)
            if not u.name or u.name.strip() == "" or u.name.lower() == "undefined":
                continue
            data.append({
                "id": u.id,
                "name": u.name,
                "mainRole": w.main_role or u.main_role or "",
                "subRole": w.sub_role or u.sub_role or "",
                "keywords": w.keywords or u.keywords or [],
                "rating": u.rating,
                "participation": u.participation,
                "hasReward": bool(w.has_reward or u.has_reward), 
            })
        except User.DoesNotExist:
            continue

    # ✅ 만약 이명준이 대기열에 추가되어 있다면 항상 포함
    try:
        mj_user = User.objects.get(id=99)
        if WaitingUser.objects.filter(user_id=99).exists():
            data.append({
                "id": mj_user.id,
                "name": mj_user.name,
                "main_role": mj_user.main_role,
                "sub_role": mj_user.sub_role,
                "keywords": mj_user.keywords,
                "rating": mj_user.rating,
                "participation": mj_user.participation,
                "hasReward": bool(mj_user.has_reward),
            })
    except User.DoesNotExist:
        pass

    unique = list({item["id"]: item for item in data}.values())
    return Response({"waiting_users": unique})

@csrf_exempt
@api_view(['POST'])
def apply_team_rematch(request):
    """
    👍 인원 유지, 👎 인원은 여기서 대기열 복귀 + 팀 재구성
    """
    data = request.data
    team_id = data.get("team_id") or data.get("teamId")
    agreed_user_ids = data.get("agreed_user_ids") or data.get("agreedUserIds")

    if not team_id or not agreed_user_ids:
        return Response({"message": "team_id 또는 agreed_user_ids가 필요합니다."}, status=400)

    team_id = int(team_id)
    agreed_user_ids = [int(uid) for uid in agreed_user_ids]

    team = get_object_or_404(Team, id=team_id)

    # ✅ 1️⃣ 피드백 중 비동의자 추출
    all_feedbacks = Feedback.objects.filter(team_id=team_id)
    disagree_ids = [f.user_id for f in all_feedbacks if not f.agree]

    # ✅ 2️⃣ 비동의자 대기열 복귀 처리
    def _rehydrate_defaults(uid: int):
        try:
            u = User.objects.get(id=uid)
            return {
                "skills": u.skills or [],
                "main_role": u.main_role or "unknown",
                "sub_role": u.sub_role,
                "keywords": u.keywords or [],
                "has_reward": bool(getattr(u, "has_reward", False)),
            }
        except User.DoesNotExist:
            return {
                "skills": [],
                "main_role": "unknown",
                "sub_role": None,
                "keywords": [],
                "has_reward": False,
            }

    with transaction.atomic():
        # ⚙️ 기존 팀 초기화
        TeamMember.objects.filter(team_id=team_id).delete()

        # 👎 비동의자 대기열 복귀
        for uid in disagree_ids:
            WaitingUser.objects.update_or_create(user_id=uid, defaults=_rehydrate_defaults(uid))

        # 👍 동의자 다시 팀에 추가
        for uid in agreed_user_ids:
            TeamMember.objects.create(team_id=team_id, user_id=uid)

        # ⚙️ 대기열에서 부족 인원 보충
        need = max(0, TEAM_SIZE - len(agreed_user_ids))
        waiting_candidates = list(WaitingUser.objects.exclude(user_id__in=agreed_user_ids))
        random.shuffle(waiting_candidates)

        new_members = list(agreed_user_ids)
        for w in waiting_candidates[:need]:
            TeamMember.objects.create(team_id=team_id, user_id=w.user_id)
            new_members.append(w.user_id)
            w.delete()  # ⚠️ 보충된 인원은 대기열에서 제거

        # 피드백 초기화 + 팀 미확정 상태로 설정
        Feedback.objects.filter(team_id=team_id).delete()
        Team.objects.filter(id=team_id).update(is_finalized=False)

    return Response({
        "message": f"재매칭 완료. 비동의자 {len(disagree_ids)}명 대기열 복귀 완료. 팀 {team_id} 재구성 완료.",
        "team_id": team_id,
        "new_members": new_members,
        "waiting_users_count": WaitingUser.objects.count(),
    }, status=200)

@csrf_exempt
@api_view(['POST'])
def move_disagreed_users_to_waiting(request):
    """
    피드백 결과 기반 팀 재조정 로직 (2025-11-03 업데이트)
    --------------------------------------------------
    1️⃣ 전원 비동의 → 팀 해체 + 전원 대기열 복귀
    2️⃣ 요청자가 '비동의자' → 요청자 + 모든 비동의자 대기열 이동, 팀원 보충
    3️⃣ 요청자가 '동의자' → 요청자 + 모든 비동의자 대기열 이동, 팀원 보충
    --------------------------------------------------
    ⚙️ 팀 정원은 항상 4명 유지
    --------------------------------------------------
    """
    data = request.data
    team_id = data.get("team_id") or data.get("teamId")
    requester_id = data.get("user_id") or data.get("userId")

    if not team_id or not requester_id:
        return Response({"message": "team_id, user_id가 필요합니다."}, status=400)

    team_id = int(team_id)
    requester_id = int(requester_id)

    feedbacks = Feedback.objects.filter(team_id=team_id)
    team_members = list(TeamMember.objects.filter(team_id=team_id).values_list("user_id", flat=True))

    if not team_members:
        return Response({"message": "팀 멤버가 존재하지 않습니다."}, status=404)

    my_feedback = feedbacks.filter(user_id=requester_id).first()
    if not my_feedback:
        return Response({"message": "요청자의 피드백 정보를 찾을 수 없습니다."}, status=404)

    disagreed_user_ids = [f.user_id for f in feedbacks if not f.agree]
    agreed_user_ids = [f.user_id for f in feedbacks if f.agree]

    TEAM_SIZE = 4

    # ✅ 대기열 복귀용 헬퍼 함수
    def _rehydrate(uid):
        try:
            u = User.objects.get(id=uid)
            return {
                "skills": u.skills or [],
                "main_role": u.main_role or "unknown",
                "sub_role": u.sub_role,
                "keywords": u.keywords or [],
                "has_reward": bool(getattr(u, "has_reward", False)),
            }
        except User.DoesNotExist:
            return {
                "skills": [],
                "main_role": "unknown",
                "sub_role": None,
                "keywords": [],
                "has_reward": False,
            }

    with transaction.atomic():
        # ✅ Case 1: 전원 비동의 → 팀 해체 + 전원 대기열 복귀
        if len(disagreed_user_ids) == len(team_members):
            for uid in team_members:
                WaitingUser.objects.update_or_create(user_id=uid, defaults=_rehydrate(uid))
            TeamMember.objects.filter(team_id=team_id).delete()
            Team.objects.filter(id=team_id).delete()
            Feedback.objects.filter(team_id=team_id).delete()

            return Response({
                "message": "전원 비동의 → 팀 해체 및 전원 대기열 복귀 완료",
                "team_id": team_id,
                "requeued_users": team_members,
            }, status=200)

        # ✅ Case 2: 요청자가 비동의자 → 요청자 + 모든 비동의자 대기열 이동 + 보충
        if not my_feedback.agree:
            out_users = disagreed_user_ids  # 모든 비동의자 포함
            stay_users = [uid for uid in team_members if uid not in out_users]

            # 🧹 비동의자 전체 대기열 이동
            for uid in out_users:
                WaitingUser.objects.update_or_create(user_id=uid, defaults=_rehydrate(uid))
            TeamMember.objects.filter(team_id=team_id, user_id__in=out_users).delete()
            Feedback.objects.filter(team_id=team_id, user_id__in=out_users).delete()

            # 👥 부족 인원 보충
            remaining_count = TeamMember.objects.filter(team_id=team_id).count()
            need = max(0, TEAM_SIZE - remaining_count)
            added_user_ids = []

            if need > 0:
                candidates = list(
                    WaitingUser.objects.exclude(user_id__in=stay_users + out_users)[:need]
                )
                for c in candidates:
                    TeamMember.objects.create(team_id=team_id, user_id=c.user_id)
                    added_user_ids.append(c.user_id)
                    c.delete()

            new_members = list(TeamMember.objects.filter(team_id=team_id).values_list("user_id", flat=True))

            return Response({
                "message": f"요청자(비동의자 포함) + 비동의자 {len(out_users)}명 대기열 이동, "
                           f"{len(added_user_ids)}명 새로 충원하여 팀 정원 유지 완료",
                "team_id": team_id,
                "removed_users": out_users,
                "added_users": added_user_ids,
                "final_members": new_members,
                "team_size": len(new_members),
            }, status=200)

        # ✅ Case 3: 요청자가 동의자 → 본인 + 모든 비동의자 대기열 이동 + 보충
        if my_feedback.agree:
            out_users = [requester_id] + disagreed_user_ids
            stay_users = [uid for uid in team_members if uid not in out_users]

            # 🧹 본인 + 비동의자 대기열 이동
            for uid in out_users:
                WaitingUser.objects.update_or_create(user_id=uid, defaults=_rehydrate(uid))
            TeamMember.objects.filter(team_id=team_id, user_id__in=out_users).delete()
            Feedback.objects.filter(team_id=team_id, user_id__in=out_users).delete()

            # 👥 부족 인원 보충
            remaining_count = TeamMember.objects.filter(team_id=team_id).count()
            need = max(0, TEAM_SIZE - remaining_count)
            added_user_ids = []

            if need > 0:
                candidates = list(
                    WaitingUser.objects.exclude(user_id__in=stay_users + out_users)[:need]
                )
                for c in candidates:
                    TeamMember.objects.create(team_id=team_id, user_id=c.user_id)
                    added_user_ids.append(c.user_id)
                    c.delete()

            new_members = list(TeamMember.objects.filter(team_id=team_id).values_list("user_id", flat=True))

            return Response({
                "message": f"동의자 {requester_id} 요청 → 본인+비동의자 {len(out_users)}명 대기열 이동, "
                           f"{len(added_user_ids)}명 새로 충원하여 팀 정원 유지 완료",
                "team_id": team_id,
                "removed_users": out_users,
                "added_users": added_user_ids,
                "final_members": new_members,
                "team_size": len(new_members),
            }, status=200)
