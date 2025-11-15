from rest_framework import serializers
from .models import User, TeamRoom, TeamMember, Application, Invitation
from .models import WaitingPool
from django.utils import timezone

#테스트용
# ✅ 1. 이 클래스들을 UserSerializer 위에 추가
class _SimpleUserSerializer(serializers.ModelSerializer):
    """Application/Invitation에 포함될 최소한의 유저 정보"""
    class Meta:
        model = User
        fields = ['id', 'name', 'main_role', 'sub_role', 'rating', 'participation', 'has_reward', 'skills', 'keywords']

class _SimpleTeamSerializer(serializers.ModelSerializer):
    """InvitationSerializer에 포함될 최소한의 팀 정보"""
    class Meta:
        model = TeamRoom
        fields = ['id', 'leader_name', 'category']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "name", "email", "has_reward"]


class InviteSerializer(serializers.ModelSerializer):
    # ✅ 읽을 때는 상세정보, 쓸 때는 ID만 받도록 수정
    user = _SimpleUserSerializer(read_only=True)
    team = _SimpleTeamSerializer(read_only=True)
    leader_name = serializers.CharField(source='team.leader.name', read_only=True)  # ✅ 추가!

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=TeamRoom.objects.all(), write_only=True
    )

    class Meta:
        model = Invitation
        fields = [
            'id', 'status', 'created_at',
            'user', 'team',
            'user_id', 'team_id',
            'leader_name',   # ✅ 추가
        ]
        read_only_fields = ('id', 'status', 'created_at', 'user', 'team', 'leader_name')

    def create(self, validated_data):
        validated_data['team'] = validated_data.pop('team_id')
        if 'user_id' in validated_data:
            validated_data['user'] = validated_data.pop('user_id')

        validated_data.setdefault('status', 'pending')
        validated_data.setdefault('created_at', timezone.now())

        return super().create(validated_data)

class TeamRoomSerializer(serializers.ModelSerializer):
    # ✅ ➊ SerializerMethodField 추가
    current_member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = TeamRoom
        fields = '__all__'  # 모든 필드 + 아래 정의된 custom field도 자동 포함
        extra_kwargs = {
            'user': {'required': False, 'allow_null': True}
        }

    def create(self, validated_data):
        print("[DEBUG] ✅ TeamRoomSerializer.create() called")
        user = self.context.get('user')

        if not user:
            print("[ERROR] ❌ context에서 user를 찾을 수 없음")
            raise serializers.ValidationError("context에 user가 없습니다.")
        

        # 1️⃣ 팀 생성
        team = TeamRoom.objects.create(user=user, **validated_data)
        print(f"[INFO] 🏗️ TeamRoom created: {team}")

        # 2️⃣ 팀장 자동 등록
        try:
            TeamMember.objects.create(
                user=user,
                team=team,
                role='leader',
                status='active'
            )
            print(f"[INFO] 👑 TeamUser 리더 등록 완료: {user.name}")
        except Exception as e:
            print(f"[ERROR] TeamUser 생성 실패: {e}")

        return team

    # ✅ ➋ 현재 팀원 수 계산 (current_member_count)
    def get_current_member_count(self, obj):
        return TeamMember.objects.filter(team=obj, status='active').count()

   # ✅ 팀 멤버 전체 정보 포함
    def get_members(self, obj):
        members = TeamMember.objects.select_related("user").filter(team=obj)
        return [
            {
                "id": m.id,
                "role": m.role,
                "status": m.status,
                "user": {
                    "id": m.user.id,
                    "name": m.user.name,
                    "intro": m.user.intro,
                    "rating": m.user.rating,
                    "participation": m.user.participation,
                    "main_role": m.user.main_role,
                    "sub_role": m.user.sub_role,
                    "skills": m.user.skills,
                    "keywords": m.user.keywords,
                    "has_reward": m.user.has_reward,
                },
            }
            for m in members
        ]

class TeamUserSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeamMember
        fields = '__all__'


class ApplicationSerializer(serializers.ModelSerializer):
    user = _SimpleUserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )
    # ✅ 'team' 대신 'team_id'를 쓰기용으로 추가
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=TeamRoom.objects.all(), source='team', write_only=True
    )
    team_leader_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Application
        fields = [
            'id', 'team', 'status', 'created_at', 
            'user', 'user_id', 
            'team_id', # 👈 'team_id' 필드 추가
            'team_leader_name'
        ]
        read_only_fields = ('status', 'created_at', 'user', 'team', 'team_leader_name')

    def get_team_leader_name(self, obj):
        return getattr(obj.team.user, "name", getattr(obj.team.user, "username", "이름 없음"))
    

class InviteSerializer(serializers.ModelSerializer):
    # ✅ 읽을 때는 상세정보, 쓸 때는 ID만 받도록 수정
    user = _SimpleUserSerializer(read_only=True)
    team = _SimpleTeamSerializer(read_only=True)

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )
    # ✅ (핵심 수정) 'source'를 제거하여, 이 필드가 'team_id'라는 이름표를 
    #    그대로 사용하도록 만듭니다.
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=TeamRoom.objects.all(), write_only=True
    )

    class Meta:
        model = Invitation
        fields = [
            'id', 'status', 'created_at',
            'user',     # 👈 읽기용 (상세 객체)
            'team',     # 👈 읽기용 (상세 객체)
            'user_id',  # 👈 쓰기용 (ID)
            'team_id',  # 👈 쓰기용 (ID)
        ]
        read_only_fields = ('id', 'status', 'created_at', 'user', 'team')

    # ✅ (핵심 수정) 'create' 함수를 수정하여 
    #    validated_data에서 'team_id'를 'team' 객체로 변환합니다.
    def create(self, validated_data):
        # team_id → team 객체 변환
        validated_data['team'] = validated_data.pop('team_id')

        # user_id → user 객체 변환 (안전 보강)
        if 'user_id' in validated_data:
            validated_data['user'] = validated_data.pop('user_id')

        # 기본값 지정
        validated_data.setdefault('status', 'pending')
        validated_data.setdefault('created_at', timezone.now())

        return super().create(validated_data)



class WaitingPoolListSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    name = serializers.CharField(source="user.name", read_only=True)
    intro = serializers.CharField(source="user.intro", read_only=True)
    rating = serializers.FloatField(source="user.rating", read_only=True)
    participation = serializers.IntegerField(source="user.participation", read_only=True)
    has_reward = serializers.SerializerMethodField()  # ✅ 수정 포인트

    class Meta:
        model = WaitingPool
        fields = [
            "id",
            "user_id",
            "name",
            "intro",
            "rating",
            "participation",
            "skills",
            "main_role",
            "sub_role",
            "keywords",
            "joined_at",
            "has_reward",  # ✅ 그대로 유지
        ]

    def get_has_reward(self, obj):
        """user.has_reward 값을 안전하게 반환"""
        return getattr(obj.user, "has_reward", False)
    

