export interface BNIContactSeed {
  name: string
  company: string
  email: string
  emails: string[]
  phone: string
  phones: string[]
  team: number // group number within the meet (1-6 for BNI power teams)
  meet: string // which meet/event this contact came from — generic for all future meets
}

// Default meets list. New meets can be added from the UI (stored in localStorage).
export const DEFAULT_MEETS: string[] = ['BNI Meet']

export const BNI_TEAMS: { id: number; name: string; color: string }[] = [
  { id: 1, name: 'Power Team 1', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 2, name: 'Power Team 2', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 3, name: 'Power Team 3', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 4, name: 'Power Team 4', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 5, name: 'Power Team 5', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 6, name: 'Power Team 6', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
]

const c = (
  name: string,
  company: string,
  email: string,
  phone: string,
  team: number,
  meet = 'BNI Meet',
): BNIContactSeed => {
  const emails = email
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const phones = phone
    .split(',')
    .map((p) => p.trim().replace(/\s+/g, ''))
    .filter(Boolean)
  return { name, company, email: emails[0] ?? '', emails, phone: phones[0] ?? '', phones, team, meet }
}

export const BNI_CONTACTS_SEED: BNIContactSeed[] = [
  // ── POWER TEAM 1 (13) ──
  c('Mr. Umesh C. Lenka', 'Q3 Quality Consultancy Pvt. Ltd.', 'umeshclenka88@gmail.com', '8767906677', 1),
  c('Mr. Tarun Sharma', 'Royal Transport Corporation', 'tarunvsharma@yahoo.co.in', '9422313978', 1),
  c('Mrs. Yasmin Mulla', 'Islah Data Consultancy', 'yasminmulla@gmail.com', '9762540516', 1),
  c('Mr. Pankaj Barhate', 'Finviser', 'pankaj@finviser.in', '9860867555', 1),
  c('Mr. Austin Das', 'Ann Engineers', 'annengineers@gmail.com', '9970837831', 1),
  c('Mr. Ajit Kate', 'Web IT Solutions', 'webitsolutions08@gmail.com', '8149820780', 1),
  c('Mr. Raghavan Krishnan', 'Orsus Solutions', 'raghavan.k@orpacsys.com', '9822978029', 1),
  c('Mr. Vinayak Rudrakanthwar', 'Innovair Technology', 'info@innovairtechnology.com', '8600340286', 1),
  c('Mr. Manish Bhandari', 'Manibhadra Engineers', 'manibhadraengineers@gmail.com', '9850231255', 1),
  c('Mr. Padmakar Dhamale', 'Scan India Solution', 'p.dhamale@scanindiasolutions.in', '9270056886', 1),
  c('Mr. Mayur Bendre', 'Quick Wave Courier Services', 'quickwavepnq@gmail.com', '9373541810', 1),
  c('Mrs. Bhagyashri Jagtap', 'Bhagyadeep Engineering', 'bhagya@bhagyadeep.com', '7758069934', 1),
  c('Mr. Abdulhafij Shaikh', 'H M Enterprises', 'hmenterprise.services@gmail.com', '9579118992', 1),

  // ── POWER TEAM 2 (13) ──
  c('Mr. Vishal Pathakk', 'Shree Vyankatesha Interior Solution Pvt. Ltd.', 'resolutecorporation@yahoo.com', '9890326634', 2),
  c('Mr. Dnyaneshwar Mahale', 'Avira Foods Pvt. Ltd.', 'info@avirafoods.com', '9762813631', 2),
  c('Mr. Rahul Borse', 'B3QRD Fasteners Pvt. Ltd.', 'info.b3qrdfasteners@gmail.com, info.pune@b3qrd.com', '7249656471', 2),
  c('Mr. Dhananjay Pawar', 'Shree Infrastructures', 'shreeinfrastructures16@gmail.com', '9922944416', 2),
  c('Mr. Mahendra Pawaskar', 'Pawaskar Engineering', 'pawaskarengineering@gmail.com', '9823228027', 2),
  c('Mr. Mustafa Shariff', 'Wealth Pride', 'mustafadshariff@gmail.com', '9623894959', 2),
  c('Mr. Javed Isak Shaikh', 'KGN Associates', 'kgnassociates72@gmail.com', '9890629444', 2),
  c('Mr. Girish Dhande', 'Swastik Enterprises', 'swastik.etp1@gmail.com', '9822102629', 2),
  c('Mr. Murtaza Ali', 'Toolings & Technologies', 'pune.tnt@gmail.com', '9922408752', 2),
  c('Mr. Nilesh Nirmal', 'Saksham Industrial Suppliers', 'sakshamindustrialsuppliers23@gmail.com', '7387640828', 2),
  c('Mr. Pandit Kingare', 'Siddheshwar Enterprises', 'siddheshwarent9@gmail.com', '9673002152', 2),
  c('Mr. Amol Bhosale', 'Sukhakarta Technical And Consultancy Services', 'stcssalespune@gmail.com, sales@sukhakartatechengg.com', '9096732220', 2),
  c('Mr. Dnyaneshwar Gaikwad', 'D P Industries', 'dpindustries02@gmail.com', '9604434898', 2),

  // ── POWER TEAM 3 (11) ──
  c('Mrs. Ashwini Mate', 'Nyati Industries Pvt. Ltd.', 'nyati.industries@gmail.com', '9881635610', 3),
  c('Mr. Tushar Agarkar', 'Elysian Elevators', 'tusharagarkar9999@gmail.com', '7757999923', 3),
  c('Mr. Sandip Altekar', 'Sundip Renewable Energy Solutions', 'sundipsolar@gmail.com', '9923030579', 3),
  c('Mrs. Roopali Mirasdar', 'Steel Life Kitchens & Rails Pvt. Ltd.', 'mkt@steellifekitchens.com', '7447454864', 3),
  c('Mr. Shivaji Gurav', 'Excellent Home Solutions', 'excellentdry@gmail.com', '9226848274', 3),
  c('Mr. Rajendra Patil', 'Shree Chintamani Services', 'chintamani1937@gmail.com', '7030020076', 3),
  c('Mr. Shivling Dhanure', 'Shree Swami Samarth Fabrication', 'shivlingshanure@gmail.com', '8766922533', 3),
  c('Mr. Arun Lohale', 'Arun CCTV Centre', 'lohalearun5@gmail.com', '7620150352', 3),
  c('Mr. Vaibhav Jain', 'Angel Home Decor', 'angelwalldecor@gmail.com', '9673628001', 3),
  c('Mr. Rushikesh Shinde', 'Nila Polycast', 'rushikeshshinde419@gmail.com', '9028843822', 3),
  c('Mr. Aashish Kadam', 'Vijayshree Realtors', 'info.vsaashish@gmail.com', '9766466748', 3),

  // ── POWER TEAM 4 (12) ──
  c('Mrs. Neha Chauhan', 'The White Space', 'thewhitespace20@gmail.com', '7447775579', 4),
  c('Ms. Teena Amrutkar', 'Hari International', 'hariinternational123@gmail.com', '7276711319, 9881471669', 4),
  c('Mr. Anil Acharya', 'AdTech Engineering', 'info@adtechengg.co.in', '8788070901', 4),
  c('Mr. Kedar Tokekar', 'Tokekar & Co.', 'kedartokekar22@gmail.com', '8888906780', 4),
  c('Mr. Dada Bhapkar', 'Bigrow Success Education Pvt. Ltd.', 'dadabbhapkar@gmail.com', '9960918504', 4),
  c('Mr. Yogesh Lakade', 'Suniyojit Fintax Solutions Pvt Ltd', 'yogeshlakadebni@gmail.com', '9561084479', 4),
  c('Mr. Pramod Behara', 'AQUA J1', 'aquaj1md@gmail.com', '9284607909', 4),
  c('Mr. Kalidas Garje', 'SV Industrial Services', 'sales.svis@gmail.com', '7775988753', 4),
  c('Ms. Meghna Sisodiya', 'Prayush Ventures', 'meghnasisodiya1512@gmail.com', '7249237880', 4),
  c('Mr. Sidharth Gund', 'Gund Engineering Corporation', 'sidharth@gecorp.in', '8285044702', 4),
  c('Mrs. Priyanka Sawant', 'OVS 360 Solutions LLP', 'priyanka.sawant@ovs360solutions.com', '9920035731', 4),
  c('Mr. Digvijay Pawar', 'APHEL AQUA SOLUTIONS LLP', 'aphelaquasolutions@gmail.com', '9697313137', 4),

  // ── POWER TEAM 5 (13) ──
  c('Mrs. Anuradha Mankare', 'Jay Packaging', 'jaypackaging6@gmail.com', '9552502602', 5),
  c('Mrs. Ruchita Tanpure', 'Santosh Engineering Works', 'specialtoolsew@gmail.com, tools@sework.in', '9326262633', 5),
  c('Ms. Divya Rathod', 'Seva Facility Services Pvt. Ltd.', 'info@sevafacility.com', '7758031803', 5),
  c('Mr. Hemendra Chavan', 'Fencer Services Pvt. Ltd.', 'hemendra.chavan@fencerservices.in', '9145314242', 5),
  c('Mr. Vijay Dhage', 'Pragati Printarts Pvt. Ltd.', 'pragatiprinters99@gmail.com', '8888104499', 5),
  c('Dr. Sonali Nalawade', 'Global Diagnostic Center', 'dr.sonalinalawade@gmail.com', '9766869424', 5),
  c('Mr. Amit Kokane', 'Confluence Technology', 'confluence.techno@gmail.com', '7798464040', 5),
  c('Mr. Gopal Bhosale', 'G-Square Engineering Pvt. Ltd.', 'gopal.bhosale@gsquareengineering.com', '9503755753', 5),
  c('Mr. Manoj Patne', 'Maxpack Industries', 'maxpackindustries2026@gmail.com', '9595626285', 5),
  c('Mr. Amit Sarode', 'Invictus Solution', 'amit@invictusmachinesolution.com', '9881272122, 9158272122', 5),
  c('Mr. Siddu Patil', 'Naxos Cranes And Components', 'sales@naxoscranes.com', '7719931742', 5),
  c('Mr. Manish Jain', 'Satkar Software Solution Pvt. Ltd.', 'manish@satkarinfotech.com', '9637682308', 5),
  c('Mr. Yasin Shaikh', 'New India Recyclers', 'info.newindiarecycle@gmail.com', '9226227867', 5),

  // ── POWER TEAM 6 (16) ──
  c('Mr. Aashiesh Rane', 'Shree Ganesh & Company', 'shreeganesh024@gmail.com', '9512203555', 6),
  c('Mrs. Sadiya Modak', 'InnoVigyan', 'sadiyamodak30@gmail.com', '7620653836', 6),
  c('Mr. Mahesh K. Mankar', 'Shivamm Vastu Consultancy', 'mankarmahesh@yahoo.com', '9823778595', 6),
  c('Mr. Pratik Mane', 'Padmapani Studio', 'manepratik86@gmail.com', '7972970058', 6),
  c('Mr. Sanjay Ghumare', 'Dwarka Construction', 'sanjayghumare76@gmail.com', '9922035781', 6),
  c('Mr. Tushar Shinde', 'Gulmohar Landscapes Pvt. Ltd.', 'tusharshinde@gmail.com', '9503459797', 6),
  c('Mr. Sandip Chavan', 'Arcsan Services', 'sandip@arcsanservices.in', '9518926679', 6),
  c('Mr. Govind Valekar', 'Trivya Developers', 'trivya.developers@gmail.com', '9822110292', 6),
  c('Mr. Naween Chandra', 'Preferred Reality', 'preferredrealtypune@gmail.com', '9356130375', 6),
  c('Mr. Sachin Pavale', 'Gatha Services', 'gathaservices@gmail.com', '9689910864', 6),
  c('Mrs. Rupali Chavan', 'LIC of INDIA', 'insurepillar@rediffmail.com', '9850498200', 6),
  c('Ms. Nikeeta Kalbande', 'NK Healthcare', 'nkhealthcare23@gmail.com', '7028016176', 6),
  c('Mr. Rohit Potdar', 'Potdar Creation', 'potdarcreation@gmail.com', '7821093916', 6),
  c('Mr. Shubham Chawaria', 'Aradhana Photography & Films', 'emmanuel.shubham@gmail.com', '8600513459', 6),
  c('Mr. Rohit Shinde', 'Sunstone Organic Farms Pvt. Ltd.', 'sunstoneorganic1@gmail.com', '7888000628', 6),
  c('Mr. Murli Nair', 'Marvel Corporation', 'marvelinfo14@gmail.com', '9545926010', 6),
]
