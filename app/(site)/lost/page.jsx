import LostFoundExplorer from '../../components/LostFoundExplorer'

export default function Page() {
  return (
    <LostFoundExplorer
      defaultStatus="LOST"
      title="Lost Items"
      description="Find lost reports, filter by location or category, and use the mobile drawer to narrow the list fast."
    />
  )
}