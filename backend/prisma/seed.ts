const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data (in correct order to avoid foreign key constraints)
  await prisma.deletedConsultationLog.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.practitionerAvailability.deleteMany();
  await prisma.consultationRating.deleteMany();
  await prisma.mediasoupRouter.deleteMany();
  await prisma.mediasoupServer.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.message.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.userSpeciality.deleteMany();
  await prisma.userLanguage.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.terms.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
  await prisma.speciality.deleteMany();
  await prisma.language.deleteMany();
  await prisma.smsProvider.deleteMany();
  await prisma.whatsapp_Template.deleteMany();

  // Create languages
  const languages = await Promise.all([
    prisma.language.create({ data: { name: 'English' } }),
    prisma.language.create({ data: { name: 'Spanish' } }),
    prisma.language.create({ data: { name: 'French' } }),
    prisma.language.create({ data: { name: 'German' } }),
    prisma.language.create({ data: { name: 'Portuguese' } }),
  ]);

  // Create specialities
  const specialities = await Promise.all([
    prisma.speciality.create({ data: { name: 'Cardiology' } }),
    prisma.speciality.create({ data: { name: 'Dermatology' } }),
    prisma.speciality.create({ data: { name: 'Neurology' } }),
    prisma.speciality.create({ data: { name: 'Pediatrics' } }),
    prisma.speciality.create({ data: { name: 'Psychiatry' } }),
    prisma.speciality.create({ data: { name: 'General Medicine' } }),
    prisma.speciality.create({ data: { name: 'Orthopedics' } }),
  ]);

  // Create organizations
  const organizations = await Promise.all([
    prisma.organization.create({
      data: {
        name: 'HealthCorp Medical Center',
        logo: 'https://example.com/logo1.png',
        primaryColor: '#2563eb',
        footerMarkdown: '© 2024 HealthCorp Medical Center. All rights reserved.',
      },
    }),
    prisma.organization.create({
      data: {
        name: 'MedTech Solutions',
        logo: 'https://example.com/logo2.png',
        primaryColor: '#059669',
        footerMarkdown: '© 2024 MedTech Solutions. Providing quality healthcare.',
      },
    }),
    prisma.organization.create({
      data: {
        name: 'Global Health Network',
        logo: 'https://example.com/logo3.png',
        primaryColor: '#dc2626',
        footerMarkdown: '© 2024 Global Health Network. Connecting patients worldwide.',
      },
    }),
  ]);

  // Hash password for users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create users
  const users = await Promise.all([
    // Admins
    prisma.user.create({
      data: {
        role: 'ADMIN',
        firstName: 'John',
        lastName: 'Admin',
        email: 'admin@healthcorp.com',
        password: hashedPassword,
        phoneNumber: '+1234567890',
        country: 'United States',
        sex: 'MALE',
        status: 'APPROVED',
      },
    }),
    
    // Practitioners
    prisma.user.create({
      data: {
        role: 'PRACTITIONER',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@healthcorp.com',
        password: hashedPassword,
        phoneNumber: '+1234567891',
        country: 'United States',
        sex: 'FEMALE',
        status: 'APPROVED',
      },
    }),
    prisma.user.create({
      data: {
        role: 'PRACTITIONER',
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@healthcorp.com',
        password: hashedPassword,
        phoneNumber: '+1234567892',
        country: 'United States',
        sex: 'MALE',
        status: 'APPROVED',
      },
    }),
    prisma.user.create({
      data: {
        role: 'PRACTITIONER',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@medtech.com',
        password: hashedPassword,
        phoneNumber: '+1234567893',
        country: 'Spain',
        sex: 'FEMALE',
        status: 'APPROVED',
      },
    }),
    prisma.user.create({
      data: {
        role: 'PRACTITIONER',
        firstName: 'David',
        lastName: 'Smith',
        email: 'david.smith@globalhealth.com',
        password: hashedPassword,
        phoneNumber: '+1234567894',
        country: 'United Kingdom',
        sex: 'MALE',
        status: 'APPROVED',
      },
    }),
    
    // Patients
    prisma.user.create({
      data: {
        role: 'PATIENT',
        firstName: 'Alice',
        lastName: 'Wilson',
        email: 'alice.wilson@email.com',
        password: hashedPassword,
        phoneNumber: '+1234567895',
        country: 'United States',
        sex: 'FEMALE',
        status: 'APPROVED',
      },
    }),
    prisma.user.create({
      data: {
        role: 'PATIENT',
        firstName: 'Robert',
        lastName: 'Brown',
        email: 'robert.brown@email.com',
        password: hashedPassword,
        phoneNumber: '+1234567896',
        country: 'Canada',
        sex: 'MALE',
        status: 'APPROVED',
      },
    }),
    prisma.user.create({
      data: {
        role: 'PATIENT',
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@email.com',
        password: hashedPassword,
        phoneNumber: '+1234567897',
        country: 'Mexico',
        sex: 'FEMALE',
        status: 'APPROVED',
      },
    }),
    prisma.user.create({
      data: {
        role: 'PATIENT',
        firstName: 'James',
        lastName: 'Taylor',
        email: 'james.taylor@email.com',
        password: hashedPassword,
        phoneNumber: '+1234567898',
        country: 'United States',
        sex: 'MALE',
        status: 'APPROVED',
      },
    }),
    prisma.user.create({
      data: {
        role: 'PATIENT',
        firstName: 'Lisa',
        lastName: 'Anderson',
        email: 'lisa.anderson@email.com',
        password: hashedPassword,
        phoneNumber: '+1234567899',
        country: 'Australia',
        sex: 'FEMALE',
        status: 'NOT_APPROVED',
      },
    }),
  ]);

  // Create organization members
  await Promise.all([
    prisma.organizationMember.create({
      data: {
        organizationId: organizations[0].id,
        userId: users[0].id, // Admin
        role: 'ADMIN',
      },
    }),
    prisma.organizationMember.create({
      data: {
        organizationId: organizations[0].id,
        userId: users[1].id, // Sarah Johnson
        role: 'MEMBER',
      },
    }),
    prisma.organizationMember.create({
      data: {
        organizationId: organizations[0].id,
        userId: users[2].id, // Michael Chen
        role: 'MEMBER',
      },
    }),
    prisma.organizationMember.create({
      data: {
        organizationId: organizations[1].id,
        userId: users[3].id, // Emily Rodriguez
        role: 'MEMBER',
      },
    }),
    prisma.organizationMember.create({
      data: {
        organizationId: organizations[2].id,
        userId: users[4].id, // David Smith
        role: 'MEMBER',
      },
    }),
  ]);

  // Create groups
  const groups = await Promise.all([
    prisma.group.create({
      data: {
        organizationId: organizations[0].id,
        name: 'Cardiology Department',
        description: 'Specialized cardiac care team',
        sharedOnlyIncomingConsultation: false,
      },
    }),
    prisma.group.create({
      data: {
        organizationId: organizations[0].id,
        name: 'Emergency Response Team',
        description: 'Quick response medical team',
        sharedOnlyIncomingConsultation: true,
      },
    }),
    prisma.group.create({
      data: {
        organizationId: organizations[1].id,
        name: 'Pediatrics Unit',
        description: 'Child healthcare specialists',
        sharedOnlyIncomingConsultation: false,
      },
    }),
  ]);

  // Create group members
  await Promise.all([
    prisma.groupMember.create({
      data: {
        groupId: groups[0].id,
        userId: users[1].id, // Sarah Johnson
      },
    }),
    prisma.groupMember.create({
      data: {
        groupId: groups[0].id,
        userId: users[2].id, // Michael Chen
      },
    }),
    prisma.groupMember.create({
      data: {
        groupId: groups[1].id,
        userId: users[1].id, // Sarah Johnson
      },
    }),
    prisma.groupMember.create({
      data: {
        groupId: groups[2].id,
        userId: users[3].id, // Emily Rodriguez
      },
    }),
  ]);

  // Create user languages
  await Promise.all([
    prisma.userLanguage.create({
      data: {
        userId: users[1].id, // Sarah Johnson
        languageId: languages[0].id, // English
      },
    }),
    prisma.userLanguage.create({
      data: {
        userId: users[2].id, // Michael Chen
        languageId: languages[0].id, // English
      },
    }),
    prisma.userLanguage.create({
      data: {
        userId: users[3].id, // Emily Rodriguez
        languageId: languages[1].id, // Spanish
      },
    }),
    prisma.userLanguage.create({
      data: {
        userId: users[3].id, // Emily Rodriguez
        languageId: languages[0].id, // English
      },
    }),
    prisma.userLanguage.create({
      data: {
        userId: users[4].id, // David Smith
        languageId: languages[0].id, // English
      },
    }),
  ]);

  // Create user specialities
  await Promise.all([
    prisma.userSpeciality.create({
      data: {
        userId: users[1].id, // Sarah Johnson
        specialityId: specialities[0].id, // Cardiology
      },
    }),
    prisma.userSpeciality.create({
      data: {
        userId: users[2].id, // Michael Chen
        specialityId: specialities[2].id, // Neurology
      },
    }),
    prisma.userSpeciality.create({
      data: {
        userId: users[3].id, // Emily Rodriguez
        specialityId: specialities[3].id, // Pediatrics
      },
    }),
    prisma.userSpeciality.create({
      data: {
        userId: users[4].id, // David Smith
        specialityId: specialities[5].id, // General Medicine
      },
    }),
  ]);

  // Create practitioner availability
  const practitionerIds = [users[1].id, users[2].id, users[3].id, users[4].id];
  
  for (const practitionerId of practitionerIds) {
    // Create availability for weekdays (Monday to Friday)
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      await prisma.practitionerAvailability.create({
        data: {
          practitionerId,
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          slotDuration: 30,
          isActive: true,
        },
      });
    }
  }

  // Create some time slots
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeSlots = await Promise.all([
    prisma.timeSlot.create({
      data: {
        practitionerId: users[1].id, // Sarah Johnson
        date: tomorrow,
        startTime: '09:00',
        endTime: '09:30',
        status: 'AVAILABLE',
      },
    }),
    prisma.timeSlot.create({
      data: {
        practitionerId: users[1].id, // Sarah Johnson
        date: tomorrow,
        startTime: '10:00',
        endTime: '10:30',
        status: 'AVAILABLE',
      },
    }),
    prisma.timeSlot.create({
      data: {
        practitionerId: users[2].id, // Michael Chen
        date: tomorrow,
        startTime: '14:00',
        endTime: '14:30',
        status: 'AVAILABLE',
      },
    }),
  ]);

  // Create MediaSoup servers
  const mediasoupServers = await Promise.all([
    prisma.mediasoupServer.create({
      data: {
        url: 'https://media1.example.com',
        username: 'media_user_1',
        password: 'media_pass_1',
        maxNumberOfSessions: 100,
        active: true,
      },
    }),
    prisma.mediasoupServer.create({
      data: {
        url: 'https://media2.example.com',
        username: 'media_user_2',
        password: 'media_pass_2',
        maxNumberOfSessions: 150,
        active: true,
      },
    }),
  ]);

  // Create consultations
  const consultations = await Promise.all([
    prisma.consultation.create({
      data: {
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        createdBy: users[1].id, // Sarah Johnson
        ownerId: users[1].id,
        groupId: groups[0].id,
        messageService: 'EMAIL',
        status: 'SCHEDULED',
      },
    }),
    prisma.consultation.create({
      data: {
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        createdBy: users[2].id, // Michael Chen
        ownerId: users[2].id,
        messageService: 'SMS',
        status: 'SCHEDULED',
      },
    }),
    prisma.consultation.create({
      data: {
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        createdBy: users[3].id, // Emily Rodriguez
        ownerId: users[3].id,
        groupId: groups[2].id,
        messageService: 'WHATSAPP',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Update time slot with consultation
  await prisma.timeSlot.update({
    where: { id: timeSlots[0].id },
    data: {
      consultationId: consultations[0].id,
      status: 'BOOKED',
    },
  });

  // Create MediaSoup routers
  await Promise.all([
    prisma.mediasoupRouter.create({
      data: {
        consultationId: consultations[0].id,
        routerId: 'router_123',
        serverId: mediasoupServers[0].id,
      },
    }),
    prisma.mediasoupRouter.create({
      data: {
        consultationId: consultations[1].id,
        routerId: 'router_456',
        serverId: mediasoupServers[1].id,
      },
    }),
  ]);

  // Create participants
  await Promise.all([
    // Consultation 1 participants
    prisma.participant.create({
      data: {
        consultationId: consultations[0].id,
        userId: users[1].id, // Sarah Johnson (practitioner)
        isActive: true,
        isBeneficiary: false,
        token: 'token_sarah_123',
        language: 'en',
      },
    }),
    prisma.participant.create({
      data: {
        consultationId: consultations[0].id,
        userId: users[5].id, // Alice Wilson (patient)
        isActive: false,
        isBeneficiary: true,
        token: 'token_alice_123',
        language: 'en',
      },
    }),
    
    // Consultation 2 participants
    prisma.participant.create({
      data: {
        consultationId: consultations[1].id,
        userId: users[2].id, // Michael Chen (practitioner)
        isActive: true,
        isBeneficiary: false,
        token: 'token_michael_456',
        language: 'en',
      },
    }),
    prisma.participant.create({
      data: {
        consultationId: consultations[1].id,
        userId: users[6].id, // Robert Brown (patient)
        isActive: false,
        isBeneficiary: true,
        token: 'token_robert_456',
        language: 'en',
      },
    }),
    
    // Consultation 3 participants (completed)
    prisma.participant.create({
      data: {
        consultationId: consultations[2].id,
        userId: users[3].id, // Emily Rodriguez (practitioner)
        isActive: false,
        isBeneficiary: false,
        token: 'token_emily_789',
        language: 'es',
        joinedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    }),
    prisma.participant.create({
      data: {
        consultationId: consultations[2].id,
        userId: users[7].id, // Maria Garcia (patient)
        isActive: false,
        isBeneficiary: true,
        token: 'token_maria_789',
        language: 'es',
        joinedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Create messages
  await Promise.all([
    prisma.message.create({
      data: {
        userId: users[1].id, // Sarah Johnson
        consultationId: consultations[0].id,
        content: 'Hello, how are you feeling today?',
      },
    }),
    prisma.message.create({
      data: {
        userId: users[5].id, // Alice Wilson
        consultationId: consultations[0].id,
        content: 'I have been experiencing some chest pain.',
      },
    }),
    prisma.message.create({
      data: {
        userId: users[1].id, // Sarah Johnson
        consultationId: consultations[0].id,
        content: 'Can you describe the pain in more detail?',
      },
    }),
    prisma.message.create({
      data: {
        userId: users[3].id, // Emily Rodriguez
        consultationId: consultations[2].id,
        content: 'Hola, ¿cómo está su hijo hoy?',
      },
    }),
    prisma.message.create({
      data: {
        userId: users[7].id, // Maria Garcia
        consultationId: consultations[2].id,
        content: 'Está mejor, gracias doctora.',
      },
    }),
  ]);

  // Create consultation rating
  await prisma.consultationRating.create({
    data: {
      consultationId: consultations[2].id, // Completed consultation
      patientId: users[7].id, // Maria Garcia
      rating: 5,
      comment: 'Excellent service, very professional and caring.',
    },
  });

  // Create SMS providers
  await Promise.all([
    prisma.smsProvider.create({
      data: {
        order: 1,
        provider: 'Twilio',
        prefix: '+1',
        isWhatsapp: false,
        isDisabled: false,
      },
    }),
    prisma.smsProvider.create({
      data: {
        order: 2,
        provider: 'WhatsApp Business',
        prefix: '+1',
        isWhatsapp: true,
        isDisabled: false,
      },
    }),
    prisma.smsProvider.create({
      data: {
        order: 3,
        provider: 'AWS SNS',
        prefix: '+1',
        isWhatsapp: false,
        isDisabled: true,
      },
    }),
  ]);

  // Create WhatsApp template
  await prisma.whatsapp_Template.create({
    data: {
      id: 'HX1234567890',
      key: 'appointment_reminder',
      friendlyName: 'Appointment Reminder',
      body: 'Hello {{1}}, your appointment with Dr. {{2}} is scheduled for {{3}}. Please reply CONFIRM to confirm or CANCEL to cancel.',
      language: 'en',
      category: 'UTILITY',
      contentType: 'text',
      variables: JSON.stringify(['patient_name', 'doctor_name', 'appointment_time']),
      actions: JSON.stringify([
        { type: 'QUICK_REPLY', text: 'CONFIRM' },
        { type: 'QUICK_REPLY', text: 'CANCEL' }
      ]),
      approvalStatus: 'APPROVED',
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
      sid: 'HX1234567890',
      types: JSON.stringify(['TEXT']),
      url: 'https://api.whatsapp.com/templates/HX1234567890',
      rejectionReason: '',
    },
  });

  // Create terms for organizations
  await Promise.all([
    prisma.terms.create({
      data: {
        organizationId: organizations[0].id,
        language: 'en',
        country: 'US',
        content: 'These are the terms and conditions for HealthCorp Medical Center...',
        version: 1.0,
      },
    }),
    prisma.terms.create({
      data: {
        organizationId: organizations[1].id,
        language: 'en',
        country: 'US',
        content: 'These are the terms and conditions for MedTech Solutions...',
        version: 1.0,
      },
    }),
    prisma.terms.create({
      data: {
        organizationId: organizations[0].id,
        language: 'es',
        country: 'ES',
        content: 'Estos son los términos y condiciones para HealthCorp Medical Center...',
        version: 1.0,
      },
    }),
  ]);

  // Create deleted consultation log
  await prisma.deletedConsultationLog.create({
    data: {
      consultationId: consultations[2].id,
      reason: 'Consultation completed and archived after 30 days',
    },
  });

  console.log('Seed completed successfully!');
  console.log('Created:');
  console.log('- 5 Languages');
  console.log('- 7 Specialities');
  console.log('- 3 Organizations');
  console.log('- 10 Users (1 Admin, 4 Practitioners, 5 Patients)');
  console.log('- 3 Groups');
  console.log('- 20 Practitioner Availability slots');
  console.log('- 3 Time Slots');
  console.log('- 3 Consultations');
  console.log('- 6 Participants');
  console.log('- 5 Messages');
  console.log('- 1 Consultation Rating');
  console.log('- 2 MediaSoup Servers');
  console.log('- 2 MediaSoup Routers');
  console.log('- 3 SMS Providers');
  console.log('- 1 WhatsApp Template');
  console.log('- 3 Terms');
  console.log('- 1 Deleted Consultation Log');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });