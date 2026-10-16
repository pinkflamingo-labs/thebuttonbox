// Measurements: everyone the maker measures, their latest measurements, every entry and a form for new ones.
import '@/styles/rooms-tools.css'
import PageHead from '@/components/PageHead'
import { requireMaker } from '@/lib/access'
import MeasurementsBoard from '@/components/rooms/MeasurementsBoard'
import { ENTRY_COLUMNS, PROFILE_COLUMNS } from '@/components/rooms/measure'

export const metadata = { title: 'Measurements' }

export default async function MeasurementsPage() {
  const { supabase, profile } = await requireMaker()
  const [people, entries] = await Promise.all([
    supabase.from('measurement_profiles').select(PROFILE_COLUMNS).order('created_at', { ascending: true }),
    supabase
      .from('measurements')
      .select(ENTRY_COLUMNS)
      .order('taken_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return (
    <>
      <PageHead
        kicker="Measurements"
        title="Your measurements"
        lede="Keep your own measurements, and those of the people you make for, in one place. They are kept in centimetres and shown in centimetres or inches."
        family="pink"
      >
        <a className="btn fam" href="#take-new">
          <svg aria-hidden="true"><use href="#i-measure" /></svg>Take new measurements
        </a>
      </PageHead>
      <MeasurementsBoard
        profiles={people.data || []}
        entries={entries.data || []}
        units={profile?.units || 'metric'}
        loadError={Boolean(people.error || entries.error)}
      />
    </>
  )
}
