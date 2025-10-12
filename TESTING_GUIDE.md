# PixelSpot Booking Flow - Comprehensive Testing Guide

## Test Environment Setup
- **Application URL**: http://localhost:5000
- **Three User Roles**: Admin, Screen Owner, Advertiser
- **Test Date**: October 12, 2025

---

## TEST SUITE 1: ADVERTISER FLOW

### Test 1.1: Create Campaign with Multiple Screens ✅
**Objective**: Verify campaign creation and booking generation

**Steps**:
1. Login as Advertiser
2. Navigate to `/advertiser/campaigns/new`
3. Complete 5-step wizard:
   - Step 1: Campaign name, objective, location (select multiple cities)
   - Step 2: Demographics (age groups, gender, affluence)
   - Step 3: Intent & Mood
   - Step 4: Duration & Venue filters
   - Step 5: Review recommended screens, select 3-5 screens
4. Upload campaign creative
5. Click "Create Campaign"

**Expected Results**:
- ✅ Campaign created successfully
- ✅ Individual bookings created for each screen
- ✅ Redirect to campaigns list
- ✅ Campaign shows "Pending Approval (X/X)"

**Verification**:
- Navigate to `/advertiser/campaigns`
- Click "View Details" on newly created campaign
- Verify all bookings listed with status "Pending Owner"

---

### Test 1.2: View Campaign Details Page ✅
**Objective**: Verify campaign details display all bookings

**Steps**:
1. From campaigns list, click "View Details"
2. Verify page shows:
   - Campaign name, objective
   - Created date, duration, budget
   - Campaign status (e.g., "Pending Approval (5/5)")
   - List of all bookings with individual statuses

**Expected Results**:
- ✅ Campaign overview section displays correctly
- ✅ All bookings listed with screen details
- ✅ Each booking shows: screen name, location, dates, price, status
- ✅ Status badges color-coded appropriately

---

### Test 1.3: Accept Alternative Dates from Owner ✅
**Objective**: Verify advertiser can accept alternative dates

**Prerequisites**: 
- Owner has rejected booking with alternative dates

**Steps**:
1. Navigate to campaign details page
2. Find booking with "Owner Rejected" status
3. Verify yellow alert box shows:
   - Alternative dates proposed
   - Owner's reason for rejection
4. Click "Accept New Dates"
5. Confirm in dialog

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Shows original vs. proposed dates
- ✅ After confirmation:
  - Booking dates updated
  - Status changes to "Pending Owner" (re-submitted)
  - Alternative dates cleared
  - Yellow alert disappears

---

### Test 1.4: Reject Alternative Dates from Owner ✅
**Objective**: Verify advertiser can decline alternative dates

**Prerequisites**: 
- Owner has rejected booking with alternative dates

**Steps**:
1. Navigate to campaign details page
2. Find booking with alternative dates
3. Click "Decline"

**Expected Results**:
- ✅ Alternative dates cleared
- ✅ Booking remains "Owner Rejected"
- ✅ Yellow alert disappears
- ✅ Booking stays rejected permanently

---

### Test 1.5: View Partial Campaign Status ✅
**Objective**: Verify campaign status reflects mixed booking states

**Prerequisites**: 
- Campaign has bookings in different states

**Steps**:
1. Navigate to `/advertiser/campaigns`
2. View campaign card with mixed booking states

**Expected Results**:
- Campaign status shows accurate count:
  - "Fully Approved (5/5)" - all approved
  - "Partially Approved (3/5 screens)" - some approved
  - "Pending Approval (2/5)" - some pending
  - "All Rejected (5/5)" - all rejected

---

## TEST SUITE 2: SCREEN OWNER FLOW

### Test 2.1: View Booking Requests ✅
**Objective**: Verify owner sees pending booking requests

**Steps**:
1. Login as Screen Owner
2. Navigate to `/owner/requests`
3. View "Pending" tab

**Expected Results**:
- ✅ Pending bookings for owner's screens displayed
- ✅ Each booking shows:
  - Screen name, location
  - Campaign name
  - Duration dates
  - Revenue amount
- ✅ Approve/Reject buttons visible

---

### Test 2.2: Approve Booking Request ✅
**Objective**: Verify owner can approve bookings

**Steps**:
1. Navigate to `/owner/requests`
2. Find pending booking
3. Click "Approve" button

**Expected Results**:
- ✅ Success toast notification
- ✅ Booking moves to "Approved" tab
- ✅ Status changes to "Awaiting Admin Approval"
- ✅ Booking disappears from "Pending" tab

**Verification**:
- Switch to advertiser account
- View campaign details
- Verify booking shows "Awaiting Admin" status

---

### Test 2.3: Reject Booking (No Alternatives) ✅
**Objective**: Verify owner can reject without offering alternatives

**Steps**:
1. Navigate to `/owner/requests`
2. Click "Reject" on pending booking
3. In dialog:
   - Enter rejection reason: "Screen unavailable due to maintenance"
   - Leave alternative dates empty
4. Click "Reject Booking"

**Expected Results**:
- ✅ Dialog appears
- ✅ Can enter rejection reason
- ✅ After confirmation:
  - Booking status: "Owner Rejected"
  - Moves to "Rejected" tab
  - Rejection reason saved

**Verification**:
- Switch to advertiser account
- View campaign details
- Verify red alert showing rejection reason
- No alternative dates option visible

---

### Test 2.4: Reject Booking with Alternative Dates ✅
**Objective**: Verify owner can suggest alternative dates

**Steps**:
1. Navigate to `/owner/requests`
2. Click "Reject" on pending booking
3. In dialog:
   - Enter reason: "Original dates booked. Can offer Oct 20-25 instead"
   - Select alternative start date: Oct 20
   - Select alternative end date: Oct 25
4. Click "Reject Booking"

**Expected Results**:
- ✅ Alternative date fields appear
- ✅ Can select both dates
- ✅ After confirmation:
  - Booking status: "Owner Rejected"
  - Alternative dates saved
  - Reason saved

**Verification**:
- Switch to advertiser account
- View campaign details
- Verify yellow alert with:
  - Original dates
  - Proposed alternative dates
  - Owner's reason
  - "Accept" and "Decline" buttons

---

### Test 2.5: Re-approve After Alternative Dates Accepted ✅
**Objective**: Verify booking returns to owner after advertiser accepts alternatives

**Prerequisites**:
- Owner rejected with alternatives
- Advertiser accepted alternative dates

**Steps**:
1. Navigate to `/owner/requests`
2. View "Pending" tab
3. Find booking that was previously rejected

**Expected Results**:
- ✅ Booking reappears in "Pending" with updated dates
- ✅ Dates match alternative dates
- ✅ Owner can approve/reject again
- ✅ Previous rejection cleared

---

## TEST SUITE 3: ADMIN FLOW

### Test 3.1: View All Bookings ✅
**Objective**: Verify admin sees all bookings across campaigns

**Steps**:
1. Login as Admin
2. Navigate to `/admin/bookings`
3. Check all tabs: Pending, Approved, Rejected, All

**Expected Results**:
- ✅ "Awaiting Approval" tab shows owner-approved bookings
- ✅ "Approved" tab shows admin-approved bookings
- ✅ "Rejected" tab shows rejected bookings
- ✅ "All" tab shows everything
- ✅ Each booking shows screen, campaign, dates, price, status

---

### Test 3.2: Approve Owner-Approved Booking ✅
**Objective**: Verify admin can give final approval

**Steps**:
1. Navigate to `/admin/bookings`
2. "Awaiting Approval" tab
3. Click "Approve" on a booking

**Expected Results**:
- ✅ Success toast notification
- ✅ Booking status: "Approved"
- ✅ Booking moves to "Approved" tab
- ✅ Badge shows green checkmark

**Verification**:
- Switch to advertiser account
- View campaign details
- Verify booking shows "Approved" status
- Campaign status updated (e.g., "Partially Approved (3/5)")

---

### Test 3.3: Reject Booking with Admin Notes ✅
**Objective**: Verify admin can reject with notes

**Steps**:
1. Navigate to `/admin/bookings`
2. Click "Reject" on any booking
3. In dialog:
   - Enter admin notes: "Campaign content violates advertising guidelines"
4. Click "Reject Booking"

**Expected Results**:
- ✅ Dialog with textarea appears
- ✅ After confirmation:
  - Booking status: "Rejected"
  - Admin notes saved
  - Moves to "Rejected" tab

**Verification**:
- Switch to advertiser account
- View campaign details
- Verify red alert showing admin rejection notes

---

### Test 3.4: Edit Booking Dates (New Feature!) ✅
**Objective**: Verify admin can modify booking dates

**Steps**:
1. Navigate to `/admin/bookings`
2. Click "Edit Dates" on any booking
3. In dialog:
   - Change start date to new date
   - Change end date to new date
   - Add note: "Adjusted dates to resolve screen availability conflict"
4. Click "Update Dates"

**Expected Results**:
- ✅ Dialog shows current dates pre-filled
- ✅ Can modify both dates
- ✅ Optional notes field
- ✅ After confirmation:
  - Booking dates updated
  - Admin notes saved
  - Success toast shown

**Verification**:
- Check booking in "All" tab
- Verify dates changed
- Switch to advertiser account
- View campaign details
- Verify new dates displayed

---

### Test 3.5: Override Owner Rejection ✅
**Objective**: Verify admin can edit dates on rejected booking

**Prerequisites**:
- Booking rejected by owner

**Steps**:
1. Navigate to `/admin/bookings`
2. Find owner-rejected booking in "Rejected" tab
3. Click "Edit Dates"
4. Change dates
5. Click "Update Dates"

**Expected Results**:
- ✅ Admin can edit dates even on rejected bookings
- ✅ Dates update successfully
- ✅ Admin effectively overrides owner rejection by modifying dates
- ✅ Provides flexibility to resolve conflicts

---

## TEST SUITE 4: INTEGRATION TESTS

### Test 4.1: Complete Flow - All Approvals ✅
**Objective**: End-to-end test with full approvals

**Steps**:
1. **Advertiser**: Create campaign with 3 screens
2. **Owner 1**: Approve booking for Screen 1
3. **Owner 2**: Approve booking for Screen 2
4. **Owner 3**: Approve booking for Screen 3
5. **Admin**: Approve all 3 bookings
6. **Advertiser**: View campaign details

**Expected Results**:
- Campaign status: "Fully Approved (3/3)"
- All bookings show "Approved" badge
- No pending actions required

---

### Test 4.2: Complete Flow - Partial Approval ✅
**Objective**: Mixed approval states

**Steps**:
1. **Advertiser**: Create campaign with 5 screens
2. **Owner 1**: Approve Screen 1
3. **Owner 2**: Reject Screen 2 (no alternatives)
4. **Owner 3**: Reject Screen 3 with alternative dates
5. **Owner 4**: Approve Screen 4
6. **Owner 5**: Approve Screen 5
7. **Admin**: Approve Screens 1, 4, 5
8. **Advertiser**: Accept alternatives for Screen 3
9. **Owner 3**: Approve Screen 3 (with new dates)
10. **Admin**: Approve Screen 3

**Expected Results**:
- Screen 1: ✅ Approved
- Screen 2: ❌ Rejected (permanent)
- Screen 3: ✅ Approved (different dates)
- Screen 4: ✅ Approved
- Screen 5: ✅ Approved
- Campaign status: "Partially Approved (4/5 screens)"

---

### Test 4.3: Complete Flow - Admin Date Override ✅
**Objective**: Admin resolves conflict with date modification

**Steps**:
1. **Advertiser**: Create campaign
2. **Owner**: Reject with reason "Dates unavailable"
3. **Admin**: 
   - View rejection
   - Click "Edit Dates"
   - Change dates to available slot
   - Add note explaining change
4. **Advertiser**: View updated booking

**Expected Results**:
- Admin successfully overrides rejection
- New dates applied
- Advertiser sees updated dates with admin note
- Booking can proceed to approval

---

## TEST SUITE 5: EDGE CASES

### Test 5.1: Alternative Dates After Already Approved ❌
**Objective**: Verify system prevents alternatives on approved bookings

**Steps**:
1. Booking already owner-approved
2. Try to reject with alternatives

**Expected Results**:
- Should not be possible (button disabled)
- Owner can only approve/reject pending bookings

---

### Test 5.2: Campaign with Zero Bookings ✅
**Objective**: Handle campaign creation with no screen selection

**Steps**:
1. Create campaign but don't select any screens

**Expected Results**:
- "Create Campaign" button disabled until at least 1 screen selected

---

### Test 5.3: Concurrent Alternative Date Acceptances ✅
**Objective**: Verify only one advertiser can accept alternatives

**Steps**:
1. Owner rejects with alternatives
2. Simulate two advertisers trying to accept simultaneously

**Expected Results**:
- First acceptance processed
- Alternative dates cleared
- Second attempt fails gracefully

---

## TESTING CHECKLIST

### Advertiser Tests
- [ ] Create campaign (multi-screen)
- [ ] View campaign details
- [ ] Accept alternative dates
- [ ] Reject alternative dates
- [ ] View partial approval status
- [ ] See rejection reasons
- [ ] See admin rejection notes

### Screen Owner Tests
- [ ] View booking requests
- [ ] Approve booking
- [ ] Reject without alternatives
- [ ] Reject with alternative dates
- [ ] Re-approve after alternative acceptance
- [ ] View approved/rejected tabs

### Admin Tests
- [ ] View all bookings
- [ ] Approve booking
- [ ] Reject with notes
- [ ] Edit booking dates
- [ ] Override owner rejection
- [ ] View all booking statuses

### Integration Tests
- [ ] Full approval flow (all screens)
- [ ] Partial approval flow (mixed states)
- [ ] Alternative dates round-trip
- [ ] Admin override scenario
- [ ] Campaign status calculations

---

## KNOWN ISSUES / BUGS TO FIX
- [ ] None identified yet (to be updated during testing)

---

## TEST RESULTS SUMMARY
**Date**: October 12, 2025
**Tester**: PixelSpot QA Team
**Status**: Ready for testing

**Pass Rate**: TBD
**Failed Tests**: TBD
**Blocked Tests**: TBD
