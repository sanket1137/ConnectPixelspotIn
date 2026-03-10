import { emailService } from './email';
import type { Booking, Screen, Campaign, User, ProofOfPlay, OwnerPayout } from '@shared/schema';

interface NotificationContext {
  booking?: Booking;
  screen?: Screen;
  campaign?: Campaign;
  user?: User;
  owner?: User;
  advertiser?: User;
  admin?: User;
  alternativeDates?: { startDate: string; endDate: string };
  rejectionReason?: string;
}

class NotificationService {
  // 1. Screen Approval Notification (Admin → Screen Owner)
  async sendScreenApprovalEmail(owner: User, screen: Screen): Promise<void> {
    const subject = '🎉 Your Screen Has Been Approved - Pixelspot';
    
    const html = this.generateHTML({
      title: 'Screen Approved!',
      greeting: `Hi ${owner.name},`,
      mainMessage: `Great news! Your screen <strong>${screen.name}</strong> has been approved by our admin team and is now live on Pixelspot.`,
      details: [
        { label: 'Screen Name', value: screen.name },
        { label: 'Location', value: `${screen.venueName}, ${screen.city}` },
        { label: 'Price per Day', value: `₹${screen.pricePerDay}` },
        { label: 'Status', value: 'Active' },
      ],
      actionText: 'Your screen is now visible to advertisers and ready to receive booking requests.',
      ctaText: 'View My Screens',
      ctaLink: 'https://pixelspot.in/owner/screens',
    });

    const text = this.generateText({
      title: 'Screen Approved!',
      greeting: `Hi ${owner.name},`,
      mainMessage: `Your screen "${screen.name}" has been approved and is now live.`,
      details: `Location: ${screen.venueName}, ${screen.city}\nPrice: ₹${screen.pricePerDay}/day`,
    });

    await emailService.sendEmail({ to: owner.email, subject, html, text });
  }

  // 2. Booking Request Notification (Advertiser → Admin & Screen Owner)
  async sendBookingRequestEmails(
    advertiser: User,
    owner: User,
    admin: User,
    booking: Booking,
    campaign: Campaign,
    screen: Screen
  ): Promise<void> {
    // Email to Screen Owner (NO advertiser contact details)
    const ownerSubject = '📬 New Booking Request - Pixelspot';
    const ownerHtml = this.generateHTML({
      title: 'New Booking Request',
      greeting: `Hi ${owner.name},`,
      mainMessage: `You have received a new booking request for your screen <strong>${screen.name}</strong>.`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: screen.name },
        { label: 'Duration', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Amount', value: `₹${booking.price}` },
      ],
      actionText: 'Please review and respond to this booking request. Contact details will be shared after admin approval.',
      ctaText: 'Review Booking Request',
      ctaLink: 'https://pixelspot.in/owner/requests',
    });

    const ownerText = this.generateText({
      title: 'New Booking Request',
      greeting: `Hi ${owner.name},`,
      mainMessage: `New booking request for ${screen.name}`,
      details: `Campaign: ${campaign.name}\nDuration: ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}\nAmount: ₹${booking.price}`,
    });

    // Email to Admin
    const adminSubject = '📬 New Booking Request Pending Review - Pixelspot';
    const adminHtml = this.generateHTML({
      title: 'New Booking Request',
      greeting: `Hi Admin,`,
      mainMessage: `A new booking request has been submitted and requires your review.`,
      details: [
        { label: 'Advertiser', value: `${advertiser.name} (${advertiser.email})` },
        { label: 'Screen Owner', value: `${owner.name} (${owner.email})` },
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Duration', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Amount', value: `₹${booking.price}` },
      ],
      actionText: 'This booking is awaiting screen owner approval before final admin review.',
      ctaText: 'View Booking',
      ctaLink: 'https://pixelspot.in/admin/bookings',
    });

    const adminText = this.generateText({
      title: 'New Booking Request',
      greeting: `Hi Admin,`,
      mainMessage: `New booking from ${advertiser.name} for ${screen.name}`,
      details: `Campaign: ${campaign.name}\nDuration: ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}\nAmount: ₹${booking.price}`,
    });

    await Promise.all([
      emailService.sendEmail({ to: owner.email, subject: ownerSubject, html: ownerHtml, text: ownerText }),
      emailService.sendEmail({ to: admin.email, subject: adminSubject, html: adminHtml, text: adminText }),
    ]);
  }

  // 3a. Booking Approved by Owner (Screen Owner → Advertiser & Admin)
  async sendBookingOwnerApprovedEmails(
    advertiser: User,
    owner: User,
    admin: User,
    booking: Booking,
    campaign: Campaign,
    screen: Screen
  ): Promise<void> {
    // Email to Advertiser
    const advertiserSubject = '✅ Booking Request Approved by Screen Owner - Pixelspot';
    const advertiserHtml = this.generateHTML({
      title: 'Booking Approved by Screen Owner',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Good news! The screen owner has approved your booking request for <strong>${screen.name}</strong>.`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Duration', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Amount', value: `₹${booking.price}` },
        { label: 'Status', value: 'Pending Admin Approval' },
      ],
      actionText: 'Your booking is now awaiting final approval from our admin team.',
      ctaText: 'View Booking Details',
      ctaLink: 'https://pixelspot.in/advertiser/bookings',
    });

    const advertiserText = this.generateText({
      title: 'Booking Approved by Owner',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Your booking for ${screen.name} has been approved by the screen owner.`,
      details: `Status: Pending Admin Approval\nNext Step: Awaiting admin review`,
    });

    // Email to Admin
    const adminSubject = '✅ Booking Approved by Owner - Awaiting Your Review - Pixelspot';
    const adminHtml = this.generateHTML({
      title: 'Booking Awaiting Admin Approval',
      greeting: `Hi Admin,`,
      mainMessage: `A booking has been approved by the screen owner and now requires your final approval.`,
      details: [
        { label: 'Advertiser', value: `${advertiser.name} (${advertiser.email})` },
        { label: 'Screen Owner', value: `${owner.name} (${owner.email})` },
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Duration', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Amount', value: `₹${booking.price}` },
      ],
      actionText: 'Please review and approve this booking to make the campaign go live.',
      ctaText: 'Review Booking',
      ctaLink: 'https://pixelspot.in/admin/bookings',
    });

    const adminText = this.generateText({
      title: 'Booking Awaiting Admin Approval',
      greeting: `Hi Admin,`,
      mainMessage: `Booking for ${screen.name} has been approved by owner and needs your review.`,
      details: `Advertiser: ${advertiser.name}\nAmount: ₹${booking.price}`,
    });

    await Promise.all([
      emailService.sendEmail({ to: advertiser.email, subject: advertiserSubject, html: advertiserHtml, text: advertiserText }),
      emailService.sendEmail({ to: admin.email, subject: adminSubject, html: adminHtml, text: adminText }),
    ]);
  }

  // 3b. Booking Rejected by Owner (Screen Owner → Advertiser & Admin)
  async sendBookingOwnerRejectedEmails(
    advertiser: User,
    owner: User,
    admin: User,
    booking: Booking,
    campaign: Campaign,
    screen: Screen,
    reason: string
  ): Promise<void> {
    // Email to Advertiser
    const advertiserSubject = '❌ Booking Request Declined - Pixelspot';
    const advertiserHtml = this.generateHTML({
      title: 'Booking Request Declined',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Unfortunately, the screen owner has declined your booking request for <strong>${screen.name}</strong>.`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Requested Duration', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Reason', value: reason },
      ],
      actionText: 'You can explore other available screens or modify your campaign dates.',
      ctaText: 'Discover Other Screens',
      ctaLink: 'https://pixelspot.in/advertiser/discover',
    });

    const advertiserText = this.generateText({
      title: 'Booking Declined',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Your booking for ${screen.name} has been declined.`,
      details: `Reason: ${reason}`,
    });

    // Email to Admin
    const adminSubject = 'ℹ️ Booking Rejected by Screen Owner - Pixelspot';
    const adminHtml = this.generateHTML({
      title: 'Booking Rejected by Owner',
      greeting: `Hi Admin,`,
      mainMessage: `A booking request has been rejected by the screen owner.`,
      details: [
        { label: 'Advertiser', value: `${advertiser.name} (${advertiser.email})` },
        { label: 'Screen Owner', value: `${owner.name} (${owner.email})` },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Reason', value: reason },
      ],
      actionText: 'This is for your information.',
      ctaText: 'View Details',
      ctaLink: 'https://pixelspot.in/admin/bookings',
    });

    const adminText = this.generateText({
      title: 'Booking Rejected',
      greeting: `Hi Admin,`,
      mainMessage: `Booking rejected by ${owner.name}`,
      details: `Reason: ${reason}`,
    });

    await Promise.all([
      emailService.sendEmail({ to: advertiser.email, subject: advertiserSubject, html: advertiserHtml, text: advertiserText }),
      emailService.sendEmail({ to: admin.email, subject: adminSubject, html: adminHtml, text: adminText }),
    ]);
  }

  // 3c. Alternative Dates Suggested (Screen Owner → Advertiser & Admin)
  async sendAlternativeDatesEmails(
    advertiser: User,
    owner: User,
    admin: User,
    booking: Booking,
    campaign: Campaign,
    screen: Screen,
    alternativeDates: { startDate: string; endDate: string },
    reason: string
  ): Promise<void> {
    // Email to Advertiser
    const advertiserSubject = '📅 Alternative Dates Suggested - Pixelspot';
    const advertiserHtml = this.generateHTML({
      title: 'Alternative Dates Proposed',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `The screen owner has suggested alternative dates for your booking of <strong>${screen.name}</strong>.`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Original Dates', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Suggested Dates', value: `${new Date(alternativeDates.startDate).toLocaleDateString()} - ${new Date(alternativeDates.endDate).toLocaleDateString()}` },
        { label: 'Reason', value: reason },
      ],
      actionText: 'Please review and accept or decline the suggested dates.',
      ctaText: 'Review Alternative Dates',
      ctaLink: 'https://pixelspot.in/advertiser/bookings',
    });

    const advertiserText = this.generateText({
      title: 'Alternative Dates Proposed',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Screen owner has suggested different dates for ${screen.name}`,
      details: `Suggested: ${new Date(alternativeDates.startDate).toLocaleDateString()} - ${new Date(alternativeDates.endDate).toLocaleDateString()}`,
    });

    // Email to Admin
    const adminSubject = 'ℹ️ Alternative Dates Proposed by Screen Owner - Pixelspot';
    const adminHtml = this.generateHTML({
      title: 'Alternative Dates Proposed',
      greeting: `Hi Admin,`,
      mainMessage: `The screen owner has proposed alternative dates for a booking.`,
      details: [
        { label: 'Advertiser', value: advertiser.name },
        { label: 'Screen Owner', value: owner.name },
        { label: 'Screen', value: screen.name },
        { label: 'New Dates', value: `${new Date(alternativeDates.startDate).toLocaleDateString()} - ${new Date(alternativeDates.endDate).toLocaleDateString()}` },
      ],
      actionText: 'Awaiting advertiser response.',
      ctaText: 'View Details',
      ctaLink: 'https://pixelspot.in/admin/bookings',
    });

    const adminText = this.generateText({
      title: 'Alternative Dates Proposed',
      greeting: `Hi Admin,`,
      mainMessage: `Alternative dates suggested for booking`,
      details: `Screen: ${screen.name}`,
    });

    await Promise.all([
      emailService.sendEmail({ to: advertiser.email, subject: advertiserSubject, html: advertiserHtml, text: advertiserText }),
      emailService.sendEmail({ to: admin.email, subject: adminSubject, html: adminHtml, text: adminText }),
    ]);
  }

  // 4. Campaign Goes Live (Admin → Advertiser & Screen Owner)
  async sendCampaignLiveEmails(
    advertiser: User,
    owner: User,
    booking: Booking,
    campaign: Campaign,
    screen: Screen
  ): Promise<void> {
    // Email to Advertiser
    const advertiserSubject = '🎉 Your Campaign is Now Live! - Pixelspot';
    const advertiserHtml = this.generateHTML({
      title: 'Campaign is Live!',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Congratulations! Your campaign <strong>${campaign.name}</strong> has been fully approved and is now live on <strong>${screen.name}</strong>!`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Live Period', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Amount Paid', value: `₹${booking.price}` },
        { label: 'Status', value: '✅ Active' },
      ],
      actionText: 'Your ad is now being displayed to thousands of viewers!',
      ctaText: 'View Campaign Details',
      ctaLink: 'https://pixelspot.in/advertiser/campaigns',
    });

    const advertiserText = this.generateText({
      title: 'Campaign Live!',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Your campaign "${campaign.name}" is now live on ${screen.name}!`,
      details: `Duration: ${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}`,
    });

    // Email to Screen Owner (NO advertiser contact details)
    const ownerSubject = '🎉 New Campaign Going Live on Your Screen - Pixelspot';
    const ownerHtml = this.generateHTML({
      title: 'Campaign Going Live',
      greeting: `Hi ${owner.name},`,
      mainMessage: `A new campaign is now live on your screen <strong>${screen.name}</strong>!`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: screen.name },
        { label: 'Duration', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Earnings', value: `₹${booking.price}` },
      ],
      actionText: 'Thank you for partnering with us to deliver impactful advertising!',
      ctaText: 'View Booking Details',
      ctaLink: 'https://pixelspot.in/owner/requests',
    });

    const ownerText = this.generateText({
      title: 'Campaign Going Live',
      greeting: `Hi ${owner.name},`,
      mainMessage: `New campaign live on ${screen.name}`,
      details: `Earnings: ₹${booking.price}`,
    });

    await Promise.all([
      emailService.sendEmail({ to: advertiser.email, subject: advertiserSubject, html: advertiserHtml, text: advertiserText }),
      emailService.sendEmail({ to: owner.email, subject: ownerSubject, html: ownerHtml, text: ownerText }),
    ]);
  }

  // 5. Payment Required Email (System → Advertiser after owner approval)
  async sendPaymentRequiredEmail(
    advertiser: User,
    booking: Booking,
    campaign: Campaign,
    screen: Screen,
    paymentDeadline: Date
  ): Promise<void> {
    const deadlineStr = paymentDeadline.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const subject = '⏰ Payment Required — Complete Your Booking - Pixelspot';
    const html = this.generateHTML({
      title: 'Payment Required',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Your booking for screen <strong>${screen.name}</strong> has been approved by the screen owner! Please complete your payment to confirm the booking.`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Duration', value: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` },
        { label: 'Amount', value: `₹${booking.price}` },
        { label: 'Payment Deadline', value: deadlineStr },
      ],
      actionText: `Please complete your payment before ${deadlineStr}. If payment is not received by the deadline, the booking will be automatically cancelled.`,
      ctaText: 'Pay Now',
      ctaLink: `https://connect.pixelspot.in/advertiser/campaigns/${campaign.id}`,
    });

    const text = this.generateText({
      title: 'Payment Required',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Your booking for ${screen.name} has been approved. Complete payment by ${deadlineStr}.`,
      details: `Amount: ₹${booking.price}\nDeadline: ${deadlineStr}`,
    });

    await emailService.sendEmail({ to: advertiser.email, subject, html, text });
  }

  // 6. Proof of Play Verified Email (Admin → Advertiser)
  async sendProofVerifiedEmail(
    advertiser: User,
    campaign: Campaign,
    screen: Screen,
    proof: ProofOfPlay
  ): Promise<void> {
    const subject = '✅ Proof of Play Verified — Please Confirm - Pixelspot';
    const html = this.generateHTML({
      title: 'Proof of Play Verified',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `The admin team has verified the proof of play for your campaign <strong>${campaign.name}</strong> on screen <strong>${screen.name}</strong>. Please review the proof and confirm.`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Proof Files', value: `${proof.fileUrls.length} file(s) uploaded` },
        { label: 'Status', value: 'Verified — Awaiting Your Confirmation' },
      ],
      actionText: 'Please review the proof materials and confirm that your campaign was displayed correctly. Your confirmation will trigger the final payout to the screen owner.',
      ctaText: 'Review Proof',
      ctaLink: `https://connect.pixelspot.in/advertiser/campaigns/${campaign.id}`,
    });

    const text = this.generateText({
      title: 'Proof of Play Verified',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Proof of play for ${campaign.name} on ${screen.name} has been verified. Please confirm.`,
      details: `Files: ${proof.fileUrls.length} uploaded\nStatus: Awaiting your confirmation`,
    });

    await emailService.sendEmail({ to: advertiser.email, subject, html, text });
  }

  // 7. Payout Incoming Email (System → Owner)
  async sendPayoutIncomingEmail(
    owner: User,
    payout: OwnerPayout,
    screen: Screen,
    payoutType: string,
    expiresAt: Date
  ): Promise<void> {
    const expiresStr = expiresAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const typeLabel = payoutType === 'advance' ? 'Advance' : 'Final';
    const subject = `💰 ${typeLabel} Payment Ready — Action Required - Pixelspot`;
    const html = this.generateHTML({
      title: `${typeLabel} Payout Ready`,
      greeting: `Hi ${owner.name},`,
      mainMessage: `An ${typeLabel.toLowerCase()} payout of <strong>₹${(payout.payoutAmount / 100).toLocaleString("en-IN")}</strong> is ready for your screen <strong>${screen.name}</strong>.`,
      details: [
        { label: 'Screen', value: screen.name },
        { label: 'Payout Type', value: typeLabel },
        { label: 'Amount', value: `₹${(payout.payoutAmount / 100).toLocaleString("en-IN")}` },
        { label: 'Acceptance Deadline', value: expiresStr },
      ],
      actionText: 'You must accept this payout within 5 minutes. After that, the payout expires and admin will need to regenerate it.',
      ctaText: 'Accept Payout',
      ctaLink: 'https://connect.pixelspot.in/owner/payouts',
    });

    const text = this.generateText({
      title: `${typeLabel} Payout Ready`,
      greeting: `Hi ${owner.name},`,
      mainMessage: `An ${typeLabel.toLowerCase()} payout of ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")} is ready. Accept within 5 minutes.`,
      details: `Screen: ${screen.name}\nAmount: ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")}\nDeadline: ${expiresStr}`,
    });

    await emailService.sendEmail({ to: owner.email, subject, html, text });
  }

  // 8. Payout Processed Email (System → Owner)
  async sendPayoutProcessedEmail(
    owner: User,
    payout: OwnerPayout,
    screen: Screen,
    transactionRef?: string
  ): Promise<void> {
    const subject = '✅ Payout Processed — Money on the Way! - Pixelspot';
    const html = this.generateHTML({
      title: 'Payout Processed',
      greeting: `Hi ${owner.name},`,
      mainMessage: `Your payout of <strong>₹${(payout.payoutAmount / 100).toLocaleString("en-IN")}</strong> for screen <strong>${screen.name}</strong> has been processed and sent to your bank account.`,
      details: [
        { label: 'Screen', value: screen.name },
        { label: 'Amount', value: `₹${(payout.payoutAmount / 100).toLocaleString("en-IN")}` },
        { label: 'Type', value: payout.payoutType === 'advance' ? 'Advance' : 'Final' },
        ...(transactionRef ? [{ label: 'Transaction Ref', value: transactionRef }] : []),
        { label: 'Status', value: 'Processed' },
      ],
      actionText: 'The money should arrive in your bank account within 1-3 business days.',
      ctaText: 'View Earnings',
      ctaLink: 'https://connect.pixelspot.in/owner/earnings',
    });

    const text = this.generateText({
      title: 'Payout Processed',
      greeting: `Hi ${owner.name},`,
      mainMessage: `Payout of ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")} for ${screen.name} has been processed.`,
      details: `Amount: ₹${(payout.payoutAmount / 100).toLocaleString("en-IN")}${transactionRef ? `\nRef: ${transactionRef}` : ''}`,
    });

    await emailService.sendEmail({ to: owner.email, subject, html, text });
  }

  // 9. Booking Expired Email (System → Advertiser)
  async sendBookingExpiredEmail(
    advertiser: User,
    booking: Booking,
    campaign: Campaign,
    screen: Screen
  ): Promise<void> {
    const subject = '⚠️ Booking Expired — Payment Not Received - Pixelspot';
    const html = this.generateHTML({
      title: 'Booking Expired',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Your booking for screen <strong>${screen.name}</strong> has expired because payment was not completed before the deadline.`,
      details: [
        { label: 'Campaign', value: campaign.name },
        { label: 'Screen', value: `${screen.name} - ${screen.city}` },
        { label: 'Status', value: 'Expired' },
      ],
      actionText: 'The screen slot is now available again. You can create a new booking if you would still like to advertise on this screen.',
      ctaText: 'Browse Screens',
      ctaLink: 'https://connect.pixelspot.in/advertiser/discover',
    });

    const text = this.generateText({
      title: 'Booking Expired',
      greeting: `Hi ${advertiser.name},`,
      mainMessage: `Your booking for ${screen.name} has expired — payment was not received in time.`,
      details: `Campaign: ${campaign.name}\nScreen: ${screen.name}`,
    });

    await emailService.sendEmail({ to: advertiser.email, subject, html, text });
  }

  // HTML Email Template Generator
  private generateHTML(options: {
    title: string;
    greeting: string;
    mainMessage: string;
    details: Array<{ label: string; value: string }>;
    actionText: string;
    ctaText: string;
    ctaLink: string;
  }): string {
    const detailsHTML = options.details.map(
      (detail) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">
            ${detail.label}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">
            ${detail.value}
          </td>
        </tr>
      `
    ).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${options.title}</title>
        <style>
            body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { 
              text-align: center; 
              background: #000000;
              padding: 30px 20px; 
              color: white;
            }
            .logo-text {
              font-size: 36px;
              font-weight: bold;
              color: #ffffff;
              margin: 0;
              letter-spacing: 1px;
            }
            .tagline {
              color: #cccccc;
              margin: 8px 0 0 0;
              font-size: 14px;
            }
            .content { padding: 30px; }
            .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .cta-button {
              display: inline-block;
              background: #2196f3;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="logo-text">Pixelspot</h1>
                <p class="tagline">Digital Outdoor Advertising</p>
            </div>
            
            <div class="content">
                <h2 style="color: #2196f3; margin-top: 0;">${options.title}</h2>
                
                <p style="font-size: 16px; line-height: 1.6;">${options.greeting}</p>
                
                <p style="font-size: 16px; line-height: 1.6;">${options.mainMessage}</p>
                
                <table class="details-table">
                    ${detailsHTML}
                </table>
                
                <p style="font-size: 16px; line-height: 1.6;">${options.actionText}</p>
                
                <div style="text-align: center;">
                    <a href="${options.ctaLink}" class="cta-button">${options.ctaText}</a>
                </div>
            </div>
            
            <div class="footer">
                <p>Need help? Contact us at support@pixelspot.in</p>
                <p>&copy; 2025 Pixelspot. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Plain Text Email Generator
  private generateText(options: {
    title: string;
    greeting: string;
    mainMessage: string;
    details: string;
  }): string {
    return `
${options.title}
${'='.repeat(options.title.length)}

${options.greeting}

${options.mainMessage}

${options.details}

---
Pixelspot - Digital Outdoor Advertising
Need help? Contact us at support@pixelspot.in
© 2025 Pixelspot
    `.trim();
  }
}

export const notificationService = new NotificationService();
