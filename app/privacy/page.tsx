import type { Metadata } from "next";
import { LegalPage, Section, List } from "@/app/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — FlowGuard",
  description:
    "How FlowGuard collects, uses, and protects your information, including phone numbers used for SMS filter alerts.",
};

const CONTACT_EMAIL = "hello@carynligon.com";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 10, 2026"
      intro={
        <>
          This Privacy Policy explains how FlowGuard (&quot;FlowGuard&quot;,
          &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operated by
          [Company Legal Name], collects, uses, and protects information in
          connection with our water-meter and filter-monitoring service (the
          &quot;Service&quot;). By using the Service or providing your contact
          information, you agree to the practices described here.
        </>
      }
    >
      <Section heading="1. Information We Collect">
        <p>We collect the following categories of information:</p>
        <List>
          <li>
            <strong>Contact information</strong> — your name, mobile phone
            number, service address, and (if provided) email address.
          </li>
          <li>
            <strong>Device and usage data</strong> — water-usage readings, flow
            rate, battery level, and filter status reported by your connected
            water meter through the Tuya / Smart Life platform.
          </li>
          <li>
            <strong>Service records</strong> — filter configuration, alert
            history, and notification delivery status.
          </li>
        </List>
      </Section>

      <Section heading="2. How We Use Your Information">
        <List>
          <li>To monitor your water filter usage and device health.</li>
          <li>
            To send you <strong>SMS text alerts</strong> when a filter is
            approaching or has reached its replacement limit, and related
            service notifications.
          </li>
          <li>To operate, maintain, and improve the Service.</li>
          <li>To respond to your requests and provide customer support.</li>
        </List>
      </Section>

      <Section heading="3. SMS / Text Messaging Program">
        <p>
          If you provide your mobile phone number and opt in, you consent to
          receive recurring, automated SMS text alerts from FlowGuard regarding
          your water filter status and service notifications.
        </p>
        <List>
          <li>
            <strong>Message frequency varies</strong> and depends on your device
            usage and filter status.
          </li>
          <li>
            <strong>Message and data rates may apply</strong>, according to your
            mobile carrier plan.
          </li>
          <li>
            You can opt out at any time by replying <strong>STOP</strong> to any
            message. Reply <strong>HELP</strong> for help, or contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </li>
          <li>Carriers are not liable for delayed or undelivered messages.</li>
        </List>
        <p>
          <strong>
            No mobile information will be shared with third parties or
            affiliates for marketing or promotional purposes.
          </strong>{" "}
          Information sharing with subcontractors in support services, such as
          messaging providers, is limited to what is necessary to deliver the
          alerts you request. Text messaging originator opt-in data and consent
          are never shared with any third parties for their own purposes.
        </p>
      </Section>

      <Section heading="4. How We Share Information">
        <p>
          We do not sell or rent your personal information. We share information
          only with service providers who help us operate the Service, and only
          as needed to provide it:
        </p>
        <List>
          <li>
            <strong>Twilio</strong> — to deliver SMS text alerts.
          </li>
          <li>
            <strong>Tuya / Smart Life</strong> — to retrieve device and
            water-usage data from your meter.
          </li>
          <li>
            <strong>Hosting and infrastructure providers</strong> — to run and
            store data for the Service.
          </li>
        </List>
        <p>
          We may also disclose information if required by law or to protect our
          rights, users, or the public.
        </p>
      </Section>

      <Section heading="5. Data Retention">
        <p>
          We retain your information for as long as your account is active or as
          needed to provide the Service, comply with legal obligations, resolve
          disputes, and enforce our agreements. You may request deletion of your
          information as described below.
        </p>
      </Section>

      <Section heading="6. Security">
        <p>
          We use reasonable administrative, technical, and organizational
          measures to protect your information. However, no method of
          transmission or storage is completely secure, and we cannot guarantee
          absolute security.
        </p>
      </Section>

      <Section heading="7. Your Choices and Rights">
        <List>
          <li>
            <strong>SMS opt-out</strong> — reply STOP to any text message to
            stop receiving alerts.
          </li>
          <li>
            <strong>Access, correction, and deletion</strong> — contact us to
            review, update, or delete your personal information, subject to
            applicable law.
          </li>
        </List>
      </Section>

      <Section heading="8. Children's Privacy">
        <p>
          The Service is not directed to children under 13, and we do not
          knowingly collect personal information from them.
        </p>
      </Section>

      <Section heading="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Changes are
          effective when posted on this page, and the &quot;Last updated&quot;
          date will be revised accordingly.
        </p>
      </Section>

      <Section heading="10. Contact Us">
        <p>
          Questions about this Privacy Policy? Contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-blue-600 underline"
          >
            {CONTACT_EMAIL}
          </a>
          , or FlowGuard, 1720 Mary Lou Ln SE Atlanta, GA 30316.
        </p>
      </Section>
    </LegalPage>
  );
}
