using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Infrastructure.Persistence;

/// <summary>
/// Seeds development data. Called on startup only when the database has no users.
/// All user passwords: password123
/// </summary>
public static class DataSeeder
{
    public static async System.Threading.Tasks.Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        // ── Users ─────────────────────────────────────────────────────────────
        string hash = BCrypt.Net.BCrypt.HashPassword("password123");

        var an    = User.Create("Nguyen Van An",  "an@taskgenie.dev",    hash);
        var binh  = User.Create("Tran Thi Binh",  "binh@taskgenie.dev",  hash);
        var cuong = User.Create("Le Van Cuong",    "cuong@taskgenie.dev", hash);
        var dung  = User.Create("Pham Thi Dung",   "dung@taskgenie.dev",  hash);
        var duc   = User.Create("Hoang Minh Duc",  "duc@taskgenie.dev",   hash);

        db.Users.AddRange(an, binh, cuong, dung, duc);
        await db.SaveChangesAsync();

        // ── Skills ────────────────────────────────────────────────────────────
        var skills = new[]
        {
            Skill.Create("C#"),     Skill.Create("React"),   Skill.Create("SQL"),
            Skill.Create("UI/UX"),  Skill.Create("Testing"), Skill.Create("DevOps"),
            Skill.Create("Python"), Skill.Create("Node.js")
        };
        db.Skills.AddRange(skills);
        await db.SaveChangesAsync();

        Skill S(string name) => skills.First(s => s.SkillName == name);

        // ── UserSkills ────────────────────────────────────────────────────────
        db.UserSkills.AddRange(
            UserSkill.Create(an.UserId,    S("C#").SkillId,       5),
            UserSkill.Create(an.UserId,    S("SQL").SkillId,       4),
            UserSkill.Create(binh.UserId,  S("React").SkillId,     4),
            UserSkill.Create(binh.UserId,  S("UI/UX").SkillId,     3),
            UserSkill.Create(cuong.UserId, S("C#").SkillId,        4),
            UserSkill.Create(cuong.UserId, S("DevOps").SkillId,    4),
            UserSkill.Create(dung.UserId,  S("Testing").SkillId,   5),
            UserSkill.Create(dung.UserId,  S("SQL").SkillId,       3),
            UserSkill.Create(duc.UserId,   S("React").SkillId,     5),
            UserSkill.Create(duc.UserId,   S("UI/UX").SkillId,     4)
        );
        await db.SaveChangesAsync();

        // ── Organization ──────────────────────────────────────────────────────
        var org = Organization.Create("TaskGenie Corp", "Công ty phát triển phần mềm", an.UserId);
        db.Organizations.Add(org);
        await db.SaveChangesAsync();

        // ── Teams ─────────────────────────────────────────────────────────────
        var team1 = Team.Create("Alpha Team", "Backend & fullstack team", an.UserId);
        var team2 = Team.Create("Beta Team",  "Frontend & mobile team",   an.UserId);
        db.Teams.AddRange(team1, team2);
        await db.SaveChangesAsync();

        // ── TeamMembers ───────────────────────────────────────────────────────
        db.TeamMembers.AddRange(
            TeamMember.Create(team1.TeamId, an.UserId,    "LEADER"),
            TeamMember.Create(team1.TeamId, binh.UserId,  "MEMBER"),
            TeamMember.Create(team1.TeamId, cuong.UserId, "MEMBER"),
            TeamMember.Create(team1.TeamId, dung.UserId,  "MEMBER"),

            TeamMember.Create(team2.TeamId, an.UserId,   "LEADER"),
            TeamMember.Create(team2.TeamId, duc.UserId,  "MEMBER"),
            TeamMember.Create(team2.TeamId, binh.UserId, "MEMBER")
        );
        await db.SaveChangesAsync();

        // ── Projects ──────────────────────────────────────────────────────────
        var proj1 = Project.Create("E-Commerce Platform",
            "Nền tảng thương mại điện tử B2C", an.UserId, org.OrganizationId, new DateOnly(2026, 7, 31));
        proj1.SetTeamId(team1.TeamId);
        proj1.Update(null, null, "InProgress", null, null);

        var proj2 = Project.Create("Mobile App Redesign",
            "Thiết kế lại ứng dụng di động", an.UserId, org.OrganizationId, new DateOnly(2026, 8, 15));
        proj2.SetTeamId(team2.TeamId);
        proj2.Update(null, null, "InProgress", null, null);

        db.Projects.AddRange(proj1, proj2);
        await db.SaveChangesAsync();

        // ── Tasks — Project 1 ─────────────────────────────────────────────────
        // t1: done 13 ngày trễ (deadline 15/6) → penalty
        var t1 = TaskEntity.Create(proj1.ProjectId, "Setup CI/CD Pipeline",
            "Cài đặt GitHub Actions, Docker, deployment workflow",
            "High", new DateOnly(2026, 6, 15), difficulty: 3, createdBy: an.UserId);
        t1.UpdateProgress("Done", 100, "LOW", 24);

        // t2: done đúng hạn (deadline 28/6) → reward base
        var t2 = TaskEntity.Create(proj1.ProjectId, "Design Database Schema",
            "Thiết kế ERD, tạo migrations cho toàn bộ module",
            "High", new DateOnly(2026, 6, 28), difficulty: 4, createdBy: an.UserId);
        t2.UpdateProgress("Done", 100, "LOW", 32);

        // t3: done sớm 7 ngày (deadline 5/7) → reward + bonus
        var t3 = TaskEntity.Create(proj1.ProjectId, "Implement User Authentication",
            "JWT, refresh token, Google OAuth",
            "High", new DateOnly(2026, 7, 5), difficulty: 4, createdBy: an.UserId);
        t3.UpdateProgress("Done", 100, "LOW", 20);

        var t4 = TaskEntity.Create(proj1.ProjectId, "Build Product Catalog API",
            "CRUD sản phẩm, danh mục, tìm kiếm, phân trang",
            "Medium", new DateOnly(2026, 7, 8), difficulty: 3, createdBy: an.UserId);
        t4.UpdateProgress("InProgress", 55, "MEDIUM", null);

        var t5 = TaskEntity.Create(proj1.ProjectId, "Shopping Cart Feature",
            "Giỏ hàng, coupon, tính tổng giá",
            "Medium", new DateOnly(2026, 7, 15), difficulty: 3, createdBy: an.UserId);
        t5.UpdateProgress("InProgress", 20, "LOW", null);

        var t6 = TaskEntity.Create(proj1.ProjectId, "Payment Integration",
            "Tích hợp VNPay và Momo",
            "High", new DateOnly(2026, 7, 22), difficulty: 5, createdBy: an.UserId);

        var t7 = TaskEntity.Create(proj1.ProjectId, "Frontend – Product List Page",
            "Trang danh sách sản phẩm với filter và sort",
            "Medium", new DateOnly(2026, 7, 12), difficulty: 2, createdBy: an.UserId);

        var t8 = TaskEntity.Create(proj1.ProjectId, "Testing & QA",
            "Unit test, integration test, performance test",
            "Medium", new DateOnly(2026, 7, 28), difficulty: 3, createdBy: dung.UserId);

        db.Tasks.AddRange(t1, t2, t3, t4, t5, t6, t7, t8);
        await db.SaveChangesAsync();

        // ── Tasks — Project 2 ─────────────────────────────────────────────────
        // t9: done 6 ngày trễ (deadline 22/6) → penalty
        var t9 = TaskEntity.Create(proj2.ProjectId, "UX Research & User Interviews",
            "Phỏng vấn người dùng, phân tích pain point",
            "Medium", new DateOnly(2026, 6, 22), difficulty: 2, createdBy: an.UserId);
        t9.UpdateProgress("Done", 100, "LOW", 16);

        // t10: done đúng hạn (deadline 28/6) → reward base
        var t10 = TaskEntity.Create(proj2.ProjectId, "Wireframes & Prototype",
            "Thiết kế wireframe toàn bộ flow trên Figma",
            "High", new DateOnly(2026, 6, 28), difficulty: 3, createdBy: an.UserId);
        t10.UpdateProgress("Done", 100, "LOW", 24);

        var t11 = TaskEntity.Create(proj2.ProjectId, "React Native Project Setup",
            "Setup boilerplate, navigation, state management",
            "Medium", new DateOnly(2026, 7, 5), difficulty: 2, createdBy: an.UserId);
        t11.UpdateProgress("InProgress", 70, "LOW", null);

        var t12 = TaskEntity.Create(proj2.ProjectId, "Authentication Screen",
            "Màn hình đăng nhập / đăng ký / quên mật khẩu",
            "Medium", new DateOnly(2026, 7, 15), difficulty: 3, createdBy: an.UserId);

        var t13 = TaskEntity.Create(proj2.ProjectId, "Home & Dashboard Screen",
            "Màn hình chính, thống kê, feed hoạt động",
            "High", new DateOnly(2026, 7, 25), difficulty: 4, createdBy: duc.UserId);

        db.Tasks.AddRange(t9, t10, t11, t12, t13);
        await db.SaveChangesAsync();

        // ── TaskAssignees ─────────────────────────────────────────────────────
        db.TaskAssignees.AddRange(
            // Project 1
            TaskAssignee.Create(t1.TaskId,  binh.UserId),
            TaskAssignee.Create(t1.TaskId,  cuong.UserId),
            TaskAssignee.Create(t2.TaskId,  an.UserId),
            TaskAssignee.Create(t2.TaskId,  binh.UserId),
            TaskAssignee.Create(t3.TaskId,  an.UserId),
            TaskAssignee.Create(t3.TaskId,  cuong.UserId),
            TaskAssignee.Create(t4.TaskId,  an.UserId),
            TaskAssignee.Create(t4.TaskId,  cuong.UserId),
            TaskAssignee.Create(t5.TaskId,  binh.UserId),
            TaskAssignee.Create(t6.TaskId,  cuong.UserId),
            TaskAssignee.Create(t7.TaskId,  binh.UserId),
            TaskAssignee.Create(t7.TaskId,  duc.UserId),
            TaskAssignee.Create(t8.TaskId,  dung.UserId),
            // Project 2
            TaskAssignee.Create(t9.TaskId,  duc.UserId),
            TaskAssignee.Create(t10.TaskId, an.UserId),
            TaskAssignee.Create(t10.TaskId, duc.UserId),
            TaskAssignee.Create(t11.TaskId, duc.UserId),
            TaskAssignee.Create(t12.TaskId, duc.UserId),
            TaskAssignee.Create(t13.TaskId, duc.UserId)
        );
        await db.SaveChangesAsync();

        // ── UserScores (tương ứng các task Done) ─────────────────────────────
        // t1: deadline 15/6, done 28/6 → 13 ngày trễ → penalty 65 pts (binh, cuong)
        db.UserScores.AddRange(
            UserScore.CreatePenalty(binh.UserId,  65, $"Task '{t1.Title}' hoàn thành trễ 13 ngày.", t1.TaskId, proj1.ProjectId),
            UserScore.CreatePenalty(cuong.UserId, 65, $"Task '{t1.Title}' hoàn thành trễ 13 ngày.", t1.TaskId, proj1.ProjectId)
        );

        // t2: deadline 28/6, done 28/6 → đúng hạn → reward 40 pts (an, binh)
        db.UserScores.AddRange(
            UserScore.CreateReward(an.UserId,   40, $"Task '{t2.Title}' hoàn thành đúng hạn.", t2.TaskId, proj1.ProjectId),
            UserScore.CreateReward(binh.UserId, 40, $"Task '{t2.Title}' hoàn thành đúng hạn.", t2.TaskId, proj1.ProjectId)
        );

        // t3: deadline 5/7, done 28/6 → 7 ngày sớm, duration ~25 ngày → +28% bonus → reward 51 pts (an, cuong)
        db.UserScores.AddRange(
            UserScore.CreateReward(an.UserId,    51, $"Task '{t3.Title}' hoàn thành sớm 7 ngày (+28% bonus).", t3.TaskId, proj1.ProjectId),
            UserScore.CreateReward(cuong.UserId, 51, $"Task '{t3.Title}' hoàn thành sớm 7 ngày (+28% bonus).", t3.TaskId, proj1.ProjectId)
        );

        // t9: deadline 22/6, done 28/6 → 6 ngày trễ → penalty 30 pts (duc)
        db.UserScores.Add(
            UserScore.CreatePenalty(duc.UserId, 30, $"Task '{t9.Title}' hoàn thành trễ 6 ngày.", t9.TaskId, proj2.ProjectId)
        );

        // t10: deadline 28/6, done 28/6 → đúng hạn → reward 30 pts (an, duc)
        db.UserScores.AddRange(
            UserScore.CreateReward(an.UserId,  30, $"Task '{t10.Title}' hoàn thành đúng hạn.", t10.TaskId, proj2.ProjectId),
            UserScore.CreateReward(duc.UserId, 30, $"Task '{t10.Title}' hoàn thành đúng hạn.", t10.TaskId, proj2.ProjectId)
        );

        await db.SaveChangesAsync();
    }
}
