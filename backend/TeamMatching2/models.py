from django.db import models

# ===============================================================
# ✅ 1️⃣ USERS (공통)
# ===============================================================
class User(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    main_role = models.CharField(max_length=50, blank=True, null=True)
    sub_role = models.CharField(max_length=50, blank=True, null=True)
    intro = models.TextField(blank=True, null=True)
    skills = models.JSONField(default=list, blank=True, null=True)
    keywords = models.JSONField(default=list, blank=True, null=True)
    rating = models.FloatField(blank=True, null=True)
    participation = models.IntegerField(blank=True, null=True)
    has_reward = models.BooleanField(default=False)

    class Meta:
        managed = True
        db_table = 'users'

    def __str__(self):
        return self.name or f"User {self.id}"


# ===============================================================
# ✅ 2️⃣ TEAM ROOM (팀방)
# ===============================================================
class TeamRoom(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    leader_name = models.CharField(max_length=50)
    main_role = models.CharField(max_length=50, blank=True, null=True)
    sub_role = models.CharField(max_length=50, blank=True, null=True)
    skills = models.JSONField(default=list, blank=True, null=True)
    looking_for = models.JSONField(default=list, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)
    max_members = models.IntegerField(blank=True, null=True)
    intro = models.TextField(blank=True, null=True)
    keywords = models.JSONField(default=list, blank=True, null=True)
    rating = models.FloatField(blank=True, null=True)
    has_reward = models.BooleanField(default=False)
    participation = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'team_room'

    def __str__(self):
        return f"TeamRoom({self.id}, Leader={self.leader_name})"


# ===============================================================
# ✅ 3️⃣ TEAM MEMBER (팀원 목록)
# ===============================================================
class TeamMember(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    team = models.ForeignKey(TeamRoom, on_delete=models.CASCADE, db_column='team_id')
    role = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)
    joined_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'team_member'

    def __str__(self):
        return f"{self.user.name} in Team {self.team_id}"


# ===============================================================
# ✅ 4️⃣ APPLICATIONS (참가 신청)
# ===============================================================
class Application(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    team = models.ForeignKey(TeamRoom, on_delete=models.CASCADE, db_column='team_id')
    status = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, default='pending', blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'applications'

    def __str__(self):
        return f"Application(User={self.user_id}, Team={self.team_id}, Status={self.status})"


# ===============================================================
# ✅ 5️⃣ INVITATIONS (초대)
# ===============================================================
class Invitation(models.Model):
    id = models.AutoField(primary_key=True)
    team = models.ForeignKey(TeamRoom, on_delete=models.CASCADE, db_column='team_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    status = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'invitations'

    def __str__(self):
        return f"Invitation(User={self.user_id}, Team={self.team_id}, Status={self.status})"


# ===============================================================
# ✅ 6️⃣ WAITING POOL (팀매칭2 대기열)
# ===============================================================
class WaitingPool(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    skills = models.JSONField(default=list, blank=True, null=True)
    main_role = models.CharField(max_length=100, blank=True, null=True)
    sub_role = models.CharField(max_length=100, blank=True, null=True)
    keywords = models.JSONField(default=list, blank=True, null=True)
    joined_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'waiting_pool'

    def __str__(self):
        return f"WaitingPool(User={self.user_id})"
