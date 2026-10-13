  async createMeetingDebrief(
    ctx: TenantContext,
    meetingId: string,
    input: { body: string; confidential?: boolean; accessLevel?: string; approved?: boolean },
  ) {
    const encrypted = this.notesCrypto.encrypt(input.body);
    return this.prisma.withTenant(ctx.tenantId, async (tx) => {
      await this.lockMeetingClientAssignment(tx, ctx, meetingId);
      const meeting = await tx.meeting.findFirst({
        where: { id: meetingId, tenantId: ctx.tenantId, ...ownMeetingWhere(ctx.userId) },
      });
      if (!meeting) throw new NotFoundException('Meeting not found');
      return tx.meetingDebrief.create({
        data: {
          tenantId: ctx.tenantId,
          meetingId,
          clientId: meeting.clientId,
          authorUserId: ctx.userId,
          bodyCiphertext: encrypted.bodyCiphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyVersion: encrypted.keyVersion,
          confidential: input.confidential ?? true,
          accessLevel: input.accessLevel ?? 'tenant_members',
          ...(input.approved ? { status: MeetingDebriefStatus.approved } : {}),
        },
        select: debriefMetadataSelect(),
      });
    });
  }

