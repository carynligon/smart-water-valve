import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, List } from "@/app/components/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions — FlowGuard",
  description:
    "The terms governing your use of the FlowGuard water-filter monitoring service and SMS alert program.",
};

const CONTACT_EMAIL = "hello@carynligon.com";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="July 10, 2026"
      intro={
        <>
          These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of
          the FlowGuard water-meter and filter-monitoring service (the
          &quot;Service&quot;), operated by FlowGuard (&quot;FlowGuard&quot;,
          &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By using the
          Service or agreeing to receive our notifications, you accept these
          Terms.
        </>
      }
    >
      <Section heading="1. The Service">
        <p>
          FlowGuard monitors connected water meters, tracks water filter usage,
          and notifies you by SMS text message when a filter is approaching or
          has reached its replacement limit. The Service relies on data reported
          by your device and third-party platforms and is provided for
          informational and convenience purposes.
        </p>
      </Section>

      <Section heading="2. Eligibility and Accounts">
        <p>
          You must be at least 18 years old and able to form a binding contract
          to use the Service. You agree to provide accurate contact information,
          including a valid mobile phone number, and to keep it up to date.
        </p>
      </Section>

      <Section heading="3. SMS / Text Messaging Program">
        <p>
          By providing your mobile phone number and opting in, you consent to
          receive recurring, automated SMS text alerts from FlowGuard about your
          water filter status and related service notifications.
        </p>
        <List>
          <li>
            Message frequency varies based on your device usage and filter
            status.
          </li>
          <li>Message and data rates may apply.</li>
          <li>
            Reply <strong>STOP</strong> to any message to opt out, or{" "}
            <strong>HELP</strong> for assistance.
          </li>
          <li>
            Consent to receive text messages is not a condition of purchasing
            any goods or services.
          </li>
          <li>Carriers are not liable for delayed or undelivered messages.</li>
        </List>
        <p>
          Our handling of your phone number and messaging data is described in
          our{" "}
          <Link href="/privacy" className="text-blue-600 underline">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section heading="4. Acceptable Use">
        <p>You agree not to:</p>
        <List>
          <li>Use the Service for any unlawful or unauthorized purpose.</li>
          <li>
            Interfere with or disrupt the Service or the networks connected to
            it.
          </li>
          <li>
            Attempt to gain unauthorized access to any part of the Service or
            another user&apos;s data.
          </li>
        </List>
      </Section>

      <Section heading="5. Third-Party Services">
        <p>
          The Service integrates with third-party platforms, including Tuya /
          Smart Life (device data) and Twilio (SMS delivery). Your use of those
          platforms may be subject to their own terms and privacy policies. We
          are not responsible for the availability, accuracy, or practices of
          third-party services.
        </p>
      </Section>

      <Section heading="6. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
          WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. Alerts may
          be delayed, incomplete, or undelivered due to factors outside our
          control, including device connectivity, third-party platforms, and
          mobile carriers. You should not rely solely on FlowGuard alerts to
          determine when to service or replace a filter, and you remain
          responsible for the maintenance of your equipment.
        </p>
      </Section>

      <Section heading="7. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, FlowGuard and its operators
          will not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or for any loss arising from your
          use of or inability to use the Service, including any missed or
          delayed alert.
        </p>
      </Section>

      <Section heading="8. Indemnification">
        <p>
          You agree to indemnify and hold harmless FlowGuard and its operators
          from any claims, damages, or expenses arising out of your use of the
          Service or your violation of these Terms.
        </p>
      </Section>

      <Section heading="9. Changes to the Service and Terms">
        <p>
          We may modify or discontinue the Service, or update these Terms, at
          any time. Changes to these Terms are effective when posted on this
          page. Your continued use of the Service after changes take effect
          constitutes acceptance of the updated Terms.
        </p>
      </Section>

      <Section heading="10. Governing Law">
        <p>
          These Terms are governed by the laws of [State/Jurisdiction], without
          regard to its conflict-of-laws principles.
        </p>
      </Section>

      <Section heading="11. Contact Us">
        <p>
          Questions about these Terms? Contact us at{" "}
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
