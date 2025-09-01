# Enhanced Patient Flow Documentation

## Overview

This document describes the enhanced patient flow implementation for the HCW-home teleconsultation platform. The system now intelligently handles patient joining scenarios with proper state transitions and real-time WebSocket notifications.

## Patient Journey Scenarios

### 1. Magic Link Join (First Time)

**Scenario**: Patient receives invitation email with magic link and clicks to join consultation.

**Flow**:

1. Patient clicks magic link → `joinConsultationByToken()`
2. System creates/updates participant with `inWaitingRoom: true`
3. Consultation status changes from `SCHEDULED` → `WAITING`
4. Patient is redirected to waiting room
5. WebSocket events emitted:
   - `patient_joined_waiting_room`
   - `patient_in_waiting_room`

**Endpoints**:

- `POST /consultation/join/{token}` (existing)
- `POST /consultation/{id}/join/patient/smart` with `joinType: 'magic-link'`

### 2. Dashboard Rejoin (Returning Patient)

**Scenario**: Patient who was previously in consultation rejoins from patient dashboard.

**Flow Logic**:

- **If consultation is ACTIVE and patient was previously admitted** (`!inWaitingRoom`):
  - Direct join to consultation room
  - WebSocket event: `patient_rejoined_consultation`
- **If consultation is WAITING or patient was never admitted**:
  - Go to waiting room
  - WebSocket event: `patient_returned_waiting_room`

**Endpoint**:

- `POST /consultation/{id}/join/patient/smart` with `joinType: 'dashboard'`

### 3. Readmission After Disconnection

**Scenario**: Patient was in active consultation but disconnected (network issues, browser crash, etc.) and rejoins.

**Flow Logic**:

- **If consultation is still ACTIVE**:
  - Direct join to consultation room
  - WebSocket event: `patient_readmitted_consultation`
- **If consultation changed to WAITING**:
  - Go to waiting room
  - WebSocket event: `patient_waiting_for_resume`

**Endpoint**:

- `POST /consultation/{id}/join/patient/smart` with `joinType: 'readmission'`

## New API Endpoints

### Smart Patient Join

```typescript
POST /consultation/{id}/join/patient/smart
{
  "userId": number,
  "joinType": "magic-link" | "dashboard" | "readmission"
}
```

**Response**:

```typescript
{
  "success": true,
  "message": "Patient joined consultation...",
  "consultationId": number,
  "redirectTo": "waiting-room" | "consultation-room",
  "status": "WAITING" | "ACTIVE",
  "waitingRoom": { // Only if redirectTo is waiting-room
    "practitionerId": number,
    "practitionerName": string,
    "estimatedWaitTime": string
  },
  // ... other standard fields
}
```

## Enhanced WebSocket Events

### Chat Gateway Events (`/chat`)

1. **Enhanced Connection**:

   ```typescript
   // Connection with additional context
   client.handshake.query: {
     consultationId: number,
     userId: number,
     userRole: string,
     joinType: 'magic-link' | 'dashboard' | 'readmission'
   }
   ```

2. **New Events**:
   - `patient_state_transition` - Track patient state changes
   - `system_message` - Enhanced system messages with context

### Consultation Gateway Events (`/consultation`)

1. **Smart Patient Join**:

   ```typescript
   'smart_patient_join' -> {
     consultationId: number,
     patientId: number,
     joinType: 'magic-link' | 'dashboard' | 'readmission'
   }
   ```

2. **Patient Status Check**:

   ```typescript
   'check_patient_admission_status' -> {
     consultationId: number,
     patientId: number
   }
   ```

3. **Enhanced Patient Events**:
   - `patient_joined_waiting_room` - First time magic link join
   - `patient_rejoined_consultation` - Dashboard rejoin to active consultation
   - `patient_readmitted_consultation` - Reconnection to active consultation
   - `patient_returned_waiting_room` - Dashboard rejoin requiring admission
   - `patient_waiting_for_resume` - Readmission while consultation paused

## State Management

### Participant States

- `isActive`: Whether participant is currently in consultation
- `inWaitingRoom`: Whether participant is waiting for admission
- `joinedAt`: Last join timestamp

### Consultation States

- `SCHEDULED`: Consultation created but not started
- `WAITING`: Patient joined, waiting for practitioner admission
- `ACTIVE`: Both patient and practitioner in consultation
- `COMPLETED`: Consultation ended

## Database Changes

### Enhanced Participant Tracking

The system tracks participant state more comprehensively:

```sql
UPDATE participant SET
  isActive = true,
  joinedAt = NOW(),
  inWaitingRoom = CASE
    WHEN join_type = 'magic-link' THEN true
    WHEN join_type = 'dashboard' AND consultation_status != 'ACTIVE' THEN true
    WHEN join_type = 'dashboard' AND was_previously_admitted THEN false
    WHEN join_type = 'readmission' AND consultation_status = 'ACTIVE' THEN false
    ELSE true
  END
```

## Implementation Details

### Smart Join Logic (`smartPatientJoin` method)

1. **Validate Request**: Check consultation exists, patient authorized
2. **Check Current State**: Get consultation status and patient history
3. **Determine Destination**: Apply logic based on join type and state
4. **Update Database**: Update participant and consultation records
5. **Setup Media**: Initialize MediaSoup session if needed
6. **Emit Events**: Send appropriate WebSocket notifications
7. **Return Response**: Include redirect destination and context

### WebSocket Event Flow

```
Patient Join Request
        ↓
Smart Join Logic
        ↓
Database Updates
        ↓
MediaSoup Setup
        ↓
WebSocket Events:
├── To Patient: Join response with redirect
├── To Practitioner: Patient status update
└── To All Participants: State change notification
```

## Usage Examples

### Frontend Integration

```typescript
// Smart patient join
const joinResult = await fetch('/consultation/123/join/patient/smart', {
  method: 'POST',
  body: JSON.stringify({
    userId: 456,
    joinType: 'dashboard', // or 'magic-link', 'readmission'
  }),
});

if (joinResult.redirectTo === 'waiting-room') {
  // Redirect to waiting room component
  router.navigate('/waiting-room', { consultationId: 123 });
} else {
  // Redirect to consultation room
  router.navigate('/consultation', { consultationId: 123 });
}
```

### WebSocket Listening

```typescript
// Listen for patient state changes
socket.on('patient_join_state_change', (data) => {
  console.log(`Patient ${data.patientId} joined with type ${data.joinType}`);
  console.log(`New state: ${data.newState}`);

  // Update UI accordingly
  updatePatientStatus(data);
});

// Enhanced chat connection
const chatSocket = io('/chat', {
  query: {
    consultationId: 123,
    userId: 456,
    userRole: 'PATIENT',
    joinType: 'dashboard',
  },
});
```

## Benefits

1. **Intelligent Routing**: Patients automatically go to the right place based on context
2. **Seamless Reconnection**: Network disconnections don't disrupt consultation flow
3. **Real-time Updates**: All participants know patient status immediately
4. **Better UX**: No confusion about where patients should be
5. **Audit Trail**: Complete tracking of patient journey through consultation
6. **Robust State Management**: Handles edge cases and state inconsistencies

## Error Handling

The system includes comprehensive error handling for:

- Invalid join types
- Consultation not found
- Patient not authorized
- Multiple active consultations
- Media setup failures
- WebSocket connection issues

All errors include appropriate HTTP status codes and descriptive messages for frontend handling.
