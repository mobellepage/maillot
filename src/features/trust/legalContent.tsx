// The copy for the help and legal pages. Describes what the app actually
// does: escrow flow, fees from fees.ts, the processors it really calls.
import type { ReactNode } from 'react';
import { COMPANY } from '../../config/company.ts';
import type { LegalDoc } from '../../config/legal.ts';
import { Mail, P, UL } from './legalParts.tsx';
import { BUYER_AUTH_FEE_CHF, BUYER_SHIPPING_CHF, SELLER_FEE_RATE } from '../../fees.ts';

interface Section {
  h: string;
  body: ReactNode;
}

const sellerPct = Math.round(SELLER_FEE_RATE * 100) + '%';

export const DOCS: Record<LegalDoc, { title: string; intro?: string; sections: Section[] }> = {
  imprint: {
    title: 'Imprint',
    sections: [
      {
        h: 'Operator',
        body: (
          <P>
            {COMPANY.name}
            <br />
            {COMPANY.street}
            <br />
            {COMPANY.city}
            <br />
            {COMPANY.country}
          </P>
        )
      },
      {
        h: 'Registration',
        body: (
          <P>
            {COMPANY.register}
            <br />
            UID: {COMPANY.uid}
            <br />
            Represented by: {COMPANY.representatives}
          </P>
        )
      },
      {
        h: 'Contact',
        body: (
          <P>
            Email: <Mail to={COMPANY.email} />
          </P>
        )
      },
      {
        h: 'Liability for content and links',
        body: (
          <P>
            Listings, photos and descriptions are provided by sellers. Catalogue prices, charts and market values are estimates based on catalogue data and are not offers or
            guarantees of value. We are not responsible for the content of external websites we link to.
          </P>
        )
      }
    ]
  },
  terms: {
    title: 'Terms of use',
    intro: 'These terms govern your use of Maillot, a marketplace for football shirts where buyers and sellers trade with each other and Maillot handles escrow and authentication.',
    sections: [
      {
        h: '1. Your account',
        body: (
          <UL
            items={[
              'You must be at least 18 years old and give accurate information.',
              'You are responsible for activity on your account and for keeping your password secret.',
              'We may suspend accounts that break these terms, sell counterfeits or abuse disputes.'
            ]}
          />
        )
      },
      {
        h: '2. How a sale comes about',
        body: (
          <>
            <P>
              Sellers place asks (the price they will sell at) and buyers place bids (the price they will pay) or buy at the lowest ask. When a bid meets an ask, a binding
              purchase contract is formed between buyer and seller at the ask price. Maillot is not the seller; we act as an intermediary that holds the payment and
              authenticates the item.
            </P>
            <P>You can never be matched with your own listing.</P>
          </>
        )
      },
      {
        h: '3. Fees',
        body: (
          <UL
            items={[
              `Buyers pay the item price plus a CHF ${BUYER_AUTH_FEE_CHF} authentication fee and CHF ${BUYER_SHIPPING_CHF} for insured shipping.`,
              `Sellers pay a ${sellerPct} commission, deducted from the payout. Authentication and the shipping label to our centre are free for sellers.`,
              'All fees are shown before you confirm.'
            ]}
          />
        )
      },
      {
        h: '4. Payment and escrow',
        body: (
          <P>
            After a match, the buyer pays through our payment provider. The money is held and only released to the seller after the shirt has passed authentication and
            the buyer has confirmed delivery, or after a dispute has been resolved in the seller’s favour. Buyers may cancel a matched order at no cost until they have paid.
          </P>
        )
      },
      {
        h: '5. Shipping and authentication',
        body: (
          <P>
            Sellers ship to our authentication centre in Zürich using the label we provide, promptly after payment. We inspect every item (see “How authentication works”).
            Items that pass are shipped to the buyer; items that fail are returned to the seller and the buyer is refunded in full.
          </P>
        )
      },
      {
        h: '6. Disputes',
        body: (
          <P>
            If an item doesn’t arrive or isn’t as described, the buyer can open a dispute from the Orders page before confirming receipt. The payment stays in escrow while our
            team reviews it and decides to release it to the seller or refund the buyer.
          </P>
        )
      },
      {
        h: '7. Prohibited items',
        body: <UL items={['Counterfeits, replicas sold as originals and items with altered labels.', 'Stolen goods.', 'Items you don’t own or can’t ship.']} />
      },
      {
        h: '8. Liability',
        body: (
          <P>
            We are liable for intent and gross negligence. Our authentication guarantee (full refund if an item we authenticated is not genuine) applies in addition. Market
            values and price charts are estimates, not financial advice.
          </P>
        )
      },
      {
        h: '9. Changes and governing law',
        body: (
          <P>
            We may update these terms and will tell you about material changes before they apply. Swiss law applies; the place of jurisdiction is Zürich, subject to mandatory
            consumer protection rules.
          </P>
        )
      }
    ]
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'This policy explains what personal data Maillot processes, why, and your rights under the Swiss Federal Act on Data Protection (FADP) and, where it applies, the EU GDPR.',
    sections: [
      {
        h: 'Controller',
        body: (
          <P>
            {COMPANY.name}, {COMPANY.street}, {COMPANY.city}. Privacy contact: <Mail to={COMPANY.privacyEmail} />
          </P>
        )
      },
      {
        h: 'What we process',
        body: (
          <UL
            items={[
              'Account: email address and password (stored only as a hash).',
              'Marketplace activity: bids, asks, orders, disputes and their status history.',
              'Collection: shirts you add, including photos you upload and their condition details.',
              'Usage signals: which shirts you view, watch, bid on or buy, used for trending lists and your recommendations.',
              'Payments are handled by our payment provider; we never see or store your card details.'
            ]}
          />
        )
      },
      {
        h: 'Why',
        body: (
          <P>
            To run your account and the marketplace (performance of contract), to prevent fraud and counterfeits (legitimate interest), and to meet legal obligations such as
            accounting records.
          </P>
        )
      },
      {
        h: 'Service providers',
        body: (
          <UL
            items={[
              'Supabase — database, authentication and server functions, hosted in Zürich (eu-central-2).',
              'Stripe — payment processing (card, TWINT, Apple Pay).',
              'Resend — sending transactional emails such as order updates.',
              'Frankfurter (ECB reference rates) — currency conversion; your browser requests the rates, no account data is sent.'
            ]}
          />
        )
      },
      {
        h: 'Label scans',
        body: <P>When you scan a shirt label, the text recognition runs entirely in your browser. The scan photo is not uploaded unless you save it to your collection.</P>
      },
      {
        h: 'Cookies and local storage',
        body: (
          <P>
            We use no advertising or analytics trackers. Your browser stores only what the app needs to work: your sign-in session, your currency and language choice, unfinished
            drafts and cached exchange rates. Fonts are hosted by us, not loaded from third parties.
          </P>
        )
      },
      {
        h: 'Retention',
        body: (
          <P>
            Account and collection data are kept while your account exists. Order records are kept for 10 years as required for accounting. You can ask us to delete your account at
            any time.
          </P>
        )
      },
      {
        h: 'Your rights',
        body: (
          <P>
            You can request access, correction, deletion or a copy of your data, and object to processing, by writing to <Mail to={COMPANY.privacyEmail} />. You may also complain
            to the Swiss Federal Data Protection and Information Commissioner (FDPIC) or, in the EU, your local supervisory authority.
          </P>
        )
      }
    ]
  },
  help: {
    title: 'Help & contact',
    sections: [
      {
        h: 'Buying',
        body: (
          <UL
            items={[
              '“Buy now” buys at the lowest live ask. If nobody is selling your size yet, place a bid — you’ll be notified when a seller matches it.',
              'After a match, pay from the confirmation screen or your Orders page. Your money is held in escrow.',
              'Confirm receipt only once the shirt has arrived and matches the listing. Something wrong? Open a dispute instead.'
            ]}
          />
        )
      },
      {
        h: 'Selling',
        body: (
          <UL
            items={[
              'Find your shirt in the catalogue (or scan its label), choose size and condition, and set your price.',
              'If a buyer is already bidding at or above your price, it sells instantly.',
              `You receive the price minus the ${sellerPct} fee after the buyer confirms delivery.`
            ]}
          />
        )
      },
      {
        h: 'Fees',
        body: (
          <P>
            Buyers: CHF {BUYER_AUTH_FEE_CHF} authentication + CHF {BUYER_SHIPPING_CHF} insured shipping per order. Sellers: {sellerPct} commission. No listing fees.
          </P>
        )
      },
      {
        h: 'Contact',
        body: (
          <P>
            Order or account questions: <Mail to={COMPANY.supportEmail} />
            <br />
            Everything else: <Mail to={COMPANY.email} />
          </P>
        )
      }
    ]
  }
};

